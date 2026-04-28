import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = env("STUDIOMATE_BASE_URL", "https://arcpilates.studiomate.kr");
const storageState = path.resolve(env("STUDIOMATE_STORAGE_STATE", ".auth/studiomate.storageState.json"));
const outputDir = path.resolve(env("OUTPUT_DIR", "debug/site-inventory"));
const routes = parseRoutes(env("ROUTES", "schedule:/schedule,lectures:/lectures,users:/users,products:/products,sales:/sales"));

await mkdir(outputDir, { recursive: true });

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: env("HEADLESS", "true") === "true" });
const context = await newContext(browser);
const page = await context.newPage();
const inventory = [];

for (const route of routes) {
  const url = `${baseUrl}${route.path}`;
  console.log(`Inspecting ${route.key}: ${url}`);

  const result = {
    key: route.key,
    path: route.path,
    url,
    inspectedAt: new Date().toISOString()
  };

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1000);
    const bodyText = await page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
    const fileBase = `${new Date().toISOString().replace(/[:.]/g, "-")}-${route.key}`;

    if (env("SAVE_RAW", "false") === "true") {
      await writeFile(path.join(outputDir, `${fileBase}.txt`), bodyText);
      await writeFile(path.join(outputDir, `${fileBase}.html`), await page.content());
      await page.screenshot({ path: path.join(outputDir, `${fileBase}.png`), fullPage: true });
    }

    Object.assign(result, {
      title: await page.title().catch(() => ""),
      currentUrl: page.url(),
      loginLikelyRequired: bodyText.includes("로그인") && !bodyText.includes(route.label || route.key),
      textSample: sanitizeSample(bodyText),
      buttons: await collectText(page, "button", 80),
      links: await collectText(page, "a", 100),
      inputs: await collectInputs(page)
    });
  } catch (error) {
    result.error = error.message;
  }

  inventory.push(result);
}

const jsonPath = path.join(outputDir, "site-inventory.json");
const csvPath = path.join(outputDir, "site-inventory.csv");
await writeFile(jsonPath, `${JSON.stringify(inventory, null, 2)}\n`);
await writeFile(csvPath, toCsv(inventory));
await browser.close();

console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${csvPath}`);

function env(name, fallback) {
  return process.env[name] || fallback;
}

async function newContext(browser) {
  try {
    await readFile(storageState, "utf8");
    return browser.newContext({ storageState });
  } catch {
    return browser.newContext();
  }
}

function parseRoutes(value) {
  return String(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [key, routePath] = part.split(":");
      return { key, path: routePath, label: routeLabel(key) };
    });
}

function routeLabel(key) {
  return {
    schedule: "일정",
    lectures: "수업",
    users: "회원",
    products: "수강권",
    sales: "매출"
  }[key] || key;
}

function sanitizeSample(text) {
  return String(text)
    .replace(/\d{2,3}-\d{3,4}-\d{4}/g, "[phone]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\s+/g, " ")
    .slice(0, 1000);
}

async function collectText(page, selector, limit) {
  return page.locator(selector).evaluateAll((elements, max) => {
    return elements
      .map((element) => element.innerText || element.textContent || "")
      .map((text) => text.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, max);
  }, limit).catch(() => []);
}

async function collectInputs(page) {
  return page.locator("input, textarea, select").evaluateAll((elements) => {
    return elements.slice(0, 100).map((element) => ({
      tag: element.tagName.toLowerCase(),
      type: element.getAttribute("type") || "",
      name: element.getAttribute("name") || "",
      placeholder: element.getAttribute("placeholder") || "",
      ariaLabel: element.getAttribute("aria-label") || ""
    }));
  }).catch(() => []);
}

function toCsv(rows) {
  const header = ["key", "path", "currentUrl", "loginLikelyRequired", "buttonCount", "inputCount", "error"];
  const lines = [header.join(",")];

  for (const row of rows) {
    lines.push([
      row.key,
      row.path,
      row.currentUrl || "",
      row.loginLikelyRequired ?? "",
      row.buttons?.length || 0,
      row.inputs?.length || 0,
      row.error || ""
    ].map(csvEscape).join(","));
  }

  return `${lines.join("\n")}\n`;
}

function csvEscape(value) {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
