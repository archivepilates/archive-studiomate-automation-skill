#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
const baseUrl = env("STUDIOMATE_BASE_URL", "https://arcpilates.studiomate.kr");
const storageState = path.resolve(env("STUDIOMATE_STORAGE_STATE", ".auth/studiomate.storageState.json"));
const outputDir = path.resolve(env("OUTPUT_DIR", "debug/member-bookings"));
const headless = env("HEADLESS", "false") === "true";

if (!args.member) {
  console.error("Usage: node scripts/inspect-member-bookings.mjs --member <name>");
  process.exit(2);
}

await mkdir(outputDir, { recursive: true });

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless });
const context = await newContext(browser);
const page = await context.newPage();

const result = {
  member: maskName(args.member),
  readOnly: true,
  startedAt: new Date().toISOString()
};

try {
  await page.goto(`${baseUrl}/users`, { waitUntil: "networkidle", timeout: 45000 });
  await assertLoggedIn(page);
  await searchMember(page, args.member);
  await openMemberDetail(page, args.member);
  await openUsageHistory(page);

  const text = await page.locator("body").innerText({ timeout: 15000 });
  result.bookingLines = extractBookingLines(text, args.member);
  result.dates = [...new Set(result.bookingLines.map((line) => line.date))];
  result.status = "OK";
  result.message = result.dates.length > 0
    ? "예약/이용내역 날짜 추출 완료"
    : "예약 날짜를 찾지 못함. 화면 구조 또는 필터 확인 필요";
} catch (error) {
  result.status = "CHECK_FAILED";
  result.message = error.message;
  await writeSnapshot(page, "member-bookings-failed").catch(() => {});
} finally {
  result.finishedAt = new Date().toISOString();
  const outputPath = path.join(outputDir, `${timestamp()}-${safeFileName(args.member)}-bookings.json`);
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ outputPath, ...result }, null, 2));
  await browser.close();
}

function env(name, fallback) {
  return process.env[name] || fallback;
}

function parseArgs(argv) {
  return { member: valueAfter(argv, "--member") };
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

  if (!(await page.getByText("이용내역", { exact: true }).first().isVisible().catch(() => false))) {
    const memberText = page.getByText(member, { exact: false }).first();
    if (await memberText.isVisible().catch(() => false)) {
      await memberText.click();
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(1200);
    }
  }

  if (!(await page.getByText("이용내역", { exact: true }).first().isVisible().catch(() => false))) {
    throw new Error("회원 상세 화면 또는 이용내역 탭을 찾지 못함.");
  }
}

async function openUsageHistory(page) {
  await page.getByText("이용내역", { exact: true }).first().click();
  await page.waitForTimeout(1800);

  const text = await page.locator("body").innerText({ timeout: 10000 });
  if (!text.includes("이용내역")) {
    throw new Error("이용내역 화면 진입 확인 실패.");
  }
}

function extractBookingLines(text, member) {
  const lines = sanitizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const output = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const date = normalizeDate(line) || normalizeDate(`${line} ${lines[i + 1] || ""}`);
    const nearby = lines.slice(Math.max(0, i - 2), i + 5).join(" ");

    if (!date) continue;
    if (!/(예약|출석|수업|취소|대기)/.test(nearby)) continue;

    output.push({
      date,
      summary: nearby.replaceAll(member, maskName(member)).slice(0, 240)
    });
  }

  return dedupeLines(output);
}

function normalizeDate(text) {
  const dotted = String(text).match(/(20\d{2})\.\s*(\d{1,2})\.\s*(\d{1,2})\./);
  if (dotted) {
    return `${dotted[1]}-${dotted[2].padStart(2, "0")}-${dotted[3].padStart(2, "0")}`;
  }

  const dashed = String(text).match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
  if (dashed) {
    return `${dashed[1]}-${dashed[2].padStart(2, "0")}-${dashed[3].padStart(2, "0")}`;
  }

  return "";
}

function dedupeLines(lines) {
  const seen = new Set();
  return lines.filter((line) => {
    const key = `${line.date}|${line.summary}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
