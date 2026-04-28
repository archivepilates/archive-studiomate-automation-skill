#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
const baseUrl = env("STUDIOMATE_BASE_URL", "https://arcpilates.studiomate.kr");
const storageState = path.resolve(env("STUDIOMATE_STORAGE_STATE", ".auth/studiomate.storageState.json"));
const outputDir = path.resolve(env("OUTPUT_DIR", "debug/bulk-book-member"));
const headless = env("HEADLESS", "false") === "true";
const dryRun = env("DRY_RUN", "true") !== "false";
const confirm = env("CONFIRM", "false") === "true";

if (!args.member && !args.queue) {
  console.error("Usage: node scripts/bulk-book-member-dry-run.mjs --member <name> [--queue queue.json]");
  console.error("       node scripts/bulk-book-member-dry-run.mjs --queue queue.json --member <name>");
  process.exit(2);
}

if (!dryRun || confirm) {
  throw new Error("This script is dry-run only. It never submits bookings.");
}

await mkdir(outputDir, { recursive: true });

const targets = args.queue
  ? filterTargets(await readQueue(args.queue), args.member)
  : [];
const targetMember = args.member || targets[0]?.name;

if (!targetMember) {
  throw new Error("Could not determine target member.");
}

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless });
const context = await newContext(browser);
const page = await context.newPage();

const result = {
  member: maskName(targetMember),
  targetCount: targets.length,
  targetLessons: targets.map(safeLesson),
  dryRun: true,
  submitted: false,
  startedAt: new Date().toISOString()
};

try {
  await page.goto(`${baseUrl}/users`, { waitUntil: "networkidle", timeout: 45000 });
  await assertLoggedIn(page);

  await searchMember(page, targetMember);
  await openMemberDetail(page, targetMember);
  const bulkState = await openBulkBooking(page);

  const bodyText = await page.locator("body").innerText({ timeout: 15000 });
  result.availableTicketSummary = summarizeTickets(bodyText);
  result.availableLessonCount = readCount(bodyText, /예약 가능한 수업\s*\((\d+)개\)/);
  result.availableLessonsSample = bulkState.noUsableTicket ? [] : extractLessonLines(bodyText, 12);
  result.matches = matchTargets(bodyText, targets);
  result.status = statusForBulkState(bulkState, result.availableLessonCount);
  result.message = bulkState.noUsableTicket
    ? "일괄예약 화면 진입 성공. 예약 가능한 수강권 없음으로 예약 확정 단계 제외."
    : result.availableLessonCount === 0
      ? "일괄예약 화면 진입 및 수강권 선택 성공. 예약 가능한 수업 0개로 선택 단계 제외."
    : "일괄예약 화면 진입 및 대상 매칭 점검 완료. 예약 확정은 수행하지 않음.";
} catch (error) {
  result.status = "CHECK_FAILED";
  result.message = error.message;
  await writeSnapshot(page, "bulk-member-dry-run-failed").catch(() => {});
} finally {
  result.finishedAt = new Date().toISOString();
  const outputPath = path.join(outputDir, `${timestamp()}-${safeFileName(targetMember)}-dry-run.json`);
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ outputPath, ...result }, null, 2));
  await browser.close();
}

function env(name, fallback) {
  return process.env[name] || fallback;
}

function parseArgs(argv) {
  return {
    member: valueAfter(argv, "--member"),
    queue: valueAfter(argv, "--queue")
  };
}

function valueAfter(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1) return "";
  return argv[index + 1] || "";
}

async function newContext(browser) {
  try {
    await readFile(storageState, "utf8");
    return browser.newContext({ storageState });
  } catch {
    return browser.newContext();
  }
}

async function assertLoggedIn(page) {
  const text = await page.locator("body").innerText({ timeout: 12000 }).catch(() => "");
  if (text.includes("로그인") && !text.includes("회원")) {
    throw new Error(`StudioMate login required. Run npm run login or set STUDIOMATE_STORAGE_STATE. Checked: ${storageState}`);
  }
}

async function searchMember(page, member) {
  const search = page.locator([
    'input[placeholder="회원 이름 또는 전화번호 검색"]',
    'input[placeholder="이름 또는 전화번호로 검색"]',
    'input[placeholder*="회원명"]',
    'input[type="search"]'
  ].join(", ")).first();

  await search.fill(member, { timeout: 15000 });
  const apply = page.getByRole("button", { name: /^적용$/ }).first();
  if (await apply.isVisible().catch(() => false)) {
    await apply.click();
  } else {
    await search.press("Enter");
  }
  await page.waitForTimeout(1800);
}

async function openMemberDetail(page, member) {
  const row = page.locator("tr").filter({ hasText: member }).first();
  if (await row.isVisible().catch(() => false)) {
    await row.click();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1200);
  }

  if (!(await page.getByText("일괄예약", { exact: true }).first().isVisible().catch(() => false))) {
    const memberText = page.getByText(member, { exact: false }).first();
    if (await memberText.isVisible().catch(() => false)) {
      await memberText.click();
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(1200);
    }
  }

  if (!(await page.getByText("일괄예약", { exact: true }).first().isVisible().catch(() => false))) {
    throw new Error("회원 상세 화면 또는 일괄예약 버튼을 찾지 못함.");
  }
}

async function openBulkBooking(page) {
  await page.getByText("일괄예약", { exact: true }).first().click();
  await page.waitForTimeout(1500);

  let text = await page.locator("body").innerText({ timeout: 10000 });
  if (text.includes("수강권 없음") || text.includes("예약 가능한 수강권이 없습니다")) {
    return { noUsableTicket: true };
  }

  const lessonBulk = page.getByRole("button", { name: "수업 일괄 예약하기" }).first();
  if (await lessonBulk.isVisible().catch(() => false)) {
    await lessonBulk.click();
    await page.waitForTimeout(1200);
  }

  text = await page.locator("body").innerText({ timeout: 10000 });
  if (text.includes("수강권 선택") && !text.includes("예약 가능한 수업")) {
    await selectUsableTicket(page);
    text = await page.locator("body").innerText({ timeout: 15000 });
  }

  if (!text.includes("예약 가능한 수강권") && !text.includes("예약 가능한 수업")) {
    throw new Error("일괄예약 화면 진입 확인 실패.");
  }

  return { noUsableTicket: false };
}

async function selectUsableTicket(page) {
  const cardClickListener = page.locator(".userticket-card__click-listener").first();
  if (await cardClickListener.isVisible().catch(() => false)) {
    await cardClickListener.click();
    await page.waitForTimeout(1800);
    return;
  }

  const preferred = [
    page.getByText("사용중", { exact: true }).first(),
    page.getByText(/예약가능\s+\d+/).first(),
    page.getByText("사용예정", { exact: true }).first()
  ];

  for (const locator of preferred) {
    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
      await page.waitForTimeout(1800);
      return;
    }
  }

  throw new Error("선택 가능한 수강권을 찾지 못함.");
}

async function readQueue(queuePath) {
  const rows = JSON.parse(await readFile(queuePath, "utf8"));
  if (!Array.isArray(rows)) {
    throw new Error(`Queue must be a JSON array: ${queuePath}`);
  }
  return rows;
}

function filterTargets(rows, member) {
  return rows
    .filter((row) => String(row.status || row["실행상태"] || "승인") === "승인")
    .filter((row) => !member || String(row.name || row["이름"] || "").trim() === member)
    .map((row) => ({
      name: String(row.name || row["이름"] || "").trim(),
      date: String(row.date || row["예약일"] || "").trim(),
      time: String(row.time || row["시간"] || "").trim(),
      teacher: String(row.teacher || row["강사"] || "").trim(),
      key: String(row.key || row["예약키"] || "").trim()
    }))
    .filter((row) => row.name);
}

function summarizeTickets(text) {
  const lines = String(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const start = lines.findIndex((line) => line.includes("예약 가능한 수강권"));
  if (start === -1) return [];
  const end = lines.findIndex((line, index) => index > start && line.includes("예약 가능한 수업"));
  return lines.slice(start, end === -1 ? start + 20 : end).slice(0, 20);
}

function readCount(text, pattern) {
  const match = String(text).match(pattern);
  return match ? Number(match[1]) : null;
}

function extractLessonLines(text, limit) {
  const source = sectionAfter(text, "예약 가능한 수업");
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\./.test(line) || /\d{1,2}:\d{2}/.test(line))
    .map(sanitizeText)
    .slice(0, limit);
}

function sectionAfter(text, marker) {
  const source = String(text);
  const index = source.indexOf(marker);
  return index === -1 ? "" : source.slice(index);
}

function statusForBulkState(bulkState, availableLessonCount) {
  if (bulkState.noUsableTicket) return "NO_USABLE_TICKET";
  if (availableLessonCount === 0) return "NO_AVAILABLE_LESSONS";
  return "DRY_RUN_READY";
}

function matchTargets(bodyText, targets) {
  return targets.map((target) => {
    const checks = [
      target.date ? dateVariants(target.date).some((date) => bodyText.includes(date)) : true,
      target.time ? bodyText.includes(target.time) : true,
      target.teacher ? bodyText.includes(target.teacher) : true
    ];
    return {
      ...safeLesson(target),
      matched: checks.every(Boolean),
      checks
    };
  });
}

function dateVariants(date) {
  const match = String(date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return [date];
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return [`${year}. ${month}. ${day}.`, `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`];
}

function safeLesson(row) {
  return {
    date: row.date,
    time: row.time,
    teacher: row.teacher,
    key: row.key
  };
}

function maskName(name) {
  const text = String(name || "");
  if (text.length <= 1) return text;
  return `${text[0]}${"*".repeat(Math.max(1, text.length - 1))}`;
}

function safeFileName(name) {
  return String(name || "member")
    .replace(/[^\p{L}\p{N}._-]+/gu, "_")
    .slice(0, 40);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function writeSnapshot(page, label) {
  const base = path.join(outputDir, `${timestamp()}-${label}`);
  await page.screenshot({ path: `${base}.png`, fullPage: true });
  const text = await page.locator("body").innerText().catch(() => "");
  await writeFile(`${base}.txt`, sanitizeText(text));
}

function sanitizeText(text) {
  return String(text)
    .replace(/\d{2,3}-\d{3,4}-\d{4}/g, "[phone]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]");
}
