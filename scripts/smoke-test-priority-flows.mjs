#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = env("STUDIOMATE_BASE_URL", "https://arcpilates.studiomate.kr");
const storageState = path.resolve(env("STUDIOMATE_STORAGE_STATE", ".auth/studiomate.storageState.json"));
const outputDir = path.resolve(env("OUTPUT_DIR", "debug/priority-smoke"));
const downloadDir = path.join(outputDir, "downloads");
const headless = env("HEADLESS", "true") === "true";

await mkdir(downloadDir, { recursive: true });

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless });
const context = await browser.newContext({ storageState, acceptDownloads: true });
const page = await context.newPage();
const results = [];

try {
  results.push(await testMonthlyLessonCreation(page));
  results.push(await testMonthlyFixedBooking(page));
  results.push(await testWeeklyNoticePosting(page));
  results.push(await testReservationWindowSettings(page));
  results.push(await testDailyReservationHistoryDownload(page));
  results.push(await testMonthlySalesDownload(page));
} finally {
  const outputPath = path.join(outputDir, `${timestamp()}-priority-smoke-results.json`);
  await writeFile(outputPath, `${JSON.stringify({ dryRun: true, results }, null, 2)}\n`);
  console.log(JSON.stringify({ outputPath, dryRun: true, results }, null, 2));
  await browser.close();
}

async function testMonthlyLessonCreation(page) {
  await goto(page, "/schedule");
  const before = await page.locator("body").innerText({ timeout: 10000 });
  const plus = page.locator(".floating-action-button").first();
  if (await plus.isVisible().catch(() => false)) {
    await plus.click();
    await page.waitForTimeout(900);
  }
  const after = await page.locator("body").innerText({ timeout: 10000 });
  await closeAnyDialog(page);
  return result(1, "월단위 수업 생성", {
    route: page.url(),
    reached: before.includes("일정"),
    dryRunReachedCreateModal: after.includes("일정등록"),
    nextBestAutomation: "기존 수업 엑셀/일정 데이터를 기준으로 월간 생성 계획을 만든 뒤, 일정등록 모달 반복 생성은 CONFIRM=true에서만 수행"
  });
}

async function testMonthlyFixedBooking(page) {
  await goto(page, "/users");
  const text = await page.locator("body").innerText({ timeout: 10000 });
  const inputs = await visibleInputs(page);
  return result(2, "월단위 고정예약 생성", {
    route: page.url(),
    reached: text.includes("회원"),
    hasMemberSearch: inputs.some((input) => /회원|이름|전화번호/.test(input.placeholder)) || text.includes("필터된 회원"),
    reusableScript: "npm run bulk:member:dry-run",
    nextBestAutomation: "월간 queue를 회원별로 묶고 회원 상세 -> 일괄예약 DRY_RUN 매칭 후 CONFIRM=true에서만 수업 예약 완료"
  });
}

async function testWeeklyNoticePosting(page) {
  await goto(page, "/schedule");
  await clickTopMenu(page, "게시판");
  const text = await page.locator("body").innerText({ timeout: 12000 });
  const buttons = await visibleButtonTexts(page);
  return result(3, "주1회 공지사항 게시", {
    route: page.url(),
    reached: text.includes("게시판") || text.includes("공지"),
    hasWriteCandidate: /공지|등록|작성|추가|저장|게시|글쓰기/.test(text) || buttons.some((value) => /공지|등록|작성|추가|저장|게시|글쓰기/.test(value)),
    buttons: buttons.filter((value) => /공지|등록|작성|추가|저장|게시|글쓰기/.test(value)).slice(0, 20),
    nextBestAutomation: "공지 작성 화면까지 DRY_RUN으로 열고 제목/본문 미리보기 JSON 생성, 게시 버튼은 CONFIRM=true에서만 클릭"
  });
}

async function testReservationWindowSettings(page) {
  await goto(page, "/schedule");
  await clickTopMenu(page, "설정");
  await clickTextIfVisible(page, "운영정보");
  const text = await page.locator("body").innerText({ timeout: 12000 });
  const inputs = await visibleInputs(page);
  return result(4, "주1회 예약 가능 기한 설정", {
    route: page.url(),
    reached: text.includes("설정") || text.includes("운영정보"),
    hasReservationWindowText: /예약.*가능|예약.*기한|분 전까지 예약/.test(text),
    inputs: inputs.slice(0, 30),
    nextBestAutomation: "현재 값을 읽어 변경 계획을 출력하고, 저장/완료 버튼은 CONFIRM=true에서만 클릭"
  });
}

async function testDailyReservationHistoryDownload(page) {
  await goto(page, "/lectures");
  await clickTextIfVisible(page, "예약내역");
  const text = await page.locator("body").innerText({ timeout: 12000 });
  const download = await tryDownload(page, /엑셀\s*다운|다운로드/);
  return result(5, "일1회 수업 예약내역 다운로드 및 업로드", {
    route: page.url(),
    reached: text.includes("예약내역"),
    download,
    nextBestAutomation: "예약내역 다운로드 파일을 로컬에서 CSV/JSON 변환 후 검토된 결과만 Drive/Sheet에 업로드"
  });
}

async function testMonthlySalesDownload(page) {
  await goto(page, "/sales");
  const text = await page.locator("body").innerText({ timeout: 12000 });
  const downloadButtons = (await visibleButtonTexts(page)).filter((value) => /엑셀|다운로드|매출/.test(value));
  return result(6, "월1회 정산마감 매출데이터 다운로드 및 업로드", {
    route: page.url(),
    reached: text.includes("매출"),
    protectedOrNeedsExtension: text.includes("로그인 연장") || text.includes("비밀번호") || text.includes("매출"),
    downloadButtons,
    note: "매출은 보호 화면일 수 있어 2차 인증/로그인 연장 여부 확인 후 수강권매출/수업매출 다운로드를 별도 구현",
    nextBestAutomation: "2차 보호 단계는 수동 확인, 다운로드 이후 원본은 로컬 보관하고 요약만 업로드"
  });
}

async function goto(page, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 45000 });
  await closeAnyDialog(page);
  await assertLoggedIn(page);
}

async function assertLoggedIn(page) {
  const text = await page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
  if (text.includes("로그인") && !text.includes("일정") && !text.includes("수업") && !text.includes("회원")) {
    throw new Error("StudioMate login required.");
  }
}

async function closeAnyDialog(page) {
  const candidates = [
    page.getByRole("button", { name: "닫기" }).last(),
    page.getByText("닫기", { exact: true }).last(),
    page.locator(".noti-dialog .el-dialog__headerbtn").first()
  ];
  for (const locator of candidates) {
    if (await locator.isVisible().catch(() => false)) {
      await locator.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(500);
      return;
    }
  }
}

async function clickTopMenu(page, label) {
  await closeAnyDialog(page);
  const menu = page.locator(".main-nav__item").filter({ hasText: label }).first();
  if (await menu.isVisible().catch(() => false)) {
    await menu.click();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1200);
  }
  await closeAnyDialog(page);
}

async function clickTextIfVisible(page, label) {
  const locator = page.getByText(label, { exact: true }).first();
  if (await locator.isVisible().catch(() => false)) {
    await locator.click();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1000);
  }
}

async function visibleButtonTexts(page) {
  return page.locator("button").evaluateAll((buttons) => buttons
    .filter((button) => {
      const style = window.getComputedStyle(button);
      return style && style.display !== "none" && style.visibility !== "hidden";
    })
    .map((button) => (button.innerText || button.textContent || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
  ).catch(() => []);
}

async function visibleInputs(page) {
  return page.locator("input, textarea, select").evaluateAll((elements) => elements
    .filter((element) => {
      const style = window.getComputedStyle(element);
      return style && style.display !== "none" && style.visibility !== "hidden";
    })
    .map((element) => ({
      tag: element.tagName.toLowerCase(),
      type: element.getAttribute("type") || "",
      placeholder: element.getAttribute("placeholder") || "",
      value: sanitizeValue(element.value || "")
    }))
  ).catch(() => []);
}

async function tryDownload(page, buttonPattern) {
  const button = page.getByRole("button", { name: buttonPattern }).first();
  if (!(await button.isVisible().catch(() => false))) {
    return { available: false, downloaded: false, reason: "download button not visible" };
  }

  try {
    const downloadPromise = page.waitForEvent("download", { timeout: 8000 });
    await button.click();
    const download = await downloadPromise;
    const suggested = download.suggestedFilename();
    await download.saveAs(path.join(downloadDir, `${timestamp()}-${suggested}`));
    return { available: true, downloaded: true, suggestedFilename: suggested };
  } catch (error) {
    return { available: true, downloaded: false, reason: error.message };
  }
}

function result(priority, name, details) {
  return { priority, name, status: details.reached === false ? "CHECK_FAILED" : "DRY_RUN_CHECKED", details };
}

function sanitizeValue(value) {
  return String(value)
    .replace(/\d{2,3}-\d{3,4}-\d{4}/g, "[phone]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .slice(0, 120);
}

function env(name, fallback) {
  return process.env[name] || fallback;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
