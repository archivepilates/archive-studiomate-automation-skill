import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseUrl = env("STUDIOMATE_BASE_URL", "https://arcpilates.studiomate.kr");
const storageState = path.resolve(env("STUDIOMATE_STORAGE_STATE", ".auth/studiomate.storageState.json"));
const headed = env("HEADLESS", "false") !== "true";

await mkdir(path.dirname(storageState), { recursive: true });

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: !headed });
const context = await browser.newContext();
const page = await context.newPage();

await page.goto(`${baseUrl}/schedule`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);

if (await isLoggedIn(page)) {
  await context.storageState({ path: storageState });
  await browser.close();
  console.log(`Already logged in. Saved storage state: ${storageState}`);
  process.exit(0);
}

const id = process.env.STUDIOMATE_ID || "";
const password = process.env.STUDIOMATE_PW || "";

if (id && password) {
  await fillLikelyLoginForm(page, id, password);
  await Promise.race([
    page.waitForLoadState("networkidle").catch(() => {}),
    page.waitForTimeout(5000)
  ]);
}

if (!(await isLoggedIn(page))) {
  console.log("Automated login was not confirmed.");
  console.log("If the browser is visible, complete login manually, open the schedule page, then press Enter here.");
  await waitForEnter();
}

if (!(await isLoggedIn(page))) {
  await browser.close();
  throw new Error("StudioMate login was not confirmed. Storage state was not saved.");
}

await context.storageState({ path: storageState });
await browser.close();
console.log(`Saved storage state: ${storageState}`);

function env(name, fallback) {
  return process.env[name] || fallback;
}

async function isLoggedIn(page) {
  const text = await page.locator("body").innerText({ timeout: 8000 }).catch(() => "");
  if (text.includes("로그인") && !text.includes("수업 보기")) return false;
  return text.includes("일정") || text.includes("수업 보기") || text.includes("회원 보기");
}

async function fillLikelyLoginForm(page, id, password) {
  const idInput = page.locator([
    'input[name="id"]',
    'input[name="email"]',
    'input[name="username"]',
    'input[type="email"]',
    'input[type="text"]'
  ].join(", ")).first();
  const pwInput = page.locator('input[type="password"]').first();

  await idInput.fill(id, { timeout: 10000 });
  await pwInput.fill(password, { timeout: 10000 });

  const loginButton = page.getByRole("button", { name: /로그인|Login/i }).first();
  if (await loginButton.isVisible().catch(() => false)) {
    await loginButton.click();
    return;
  }

  await pwInput.press("Enter");
}

async function waitForEnter() {
  process.stdin.setEncoding("utf8");
  process.stdin.resume();
  await new Promise((resolve) => process.stdin.once("data", resolve));
  process.stdin.pause();
}
