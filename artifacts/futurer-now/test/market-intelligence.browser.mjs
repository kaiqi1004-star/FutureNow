import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:80";
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

try {
  const marketResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/future-ready/labour-market") &&
      response.request().method() === "GET",
  );
  const jobsResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/future-ready/jobs") &&
      response.request().method() === "GET",
  );
  await page.goto(`${baseURL}/market-intelligence`);
  const marketResponse = await marketResponsePromise;
  const jobsResponse = await jobsResponsePromise;
  assert.equal(marketResponse.status(), 200);
  assert.equal(jobsResponse.status(), 200);

  const initialData = await marketResponse.json();
  const jobs = await jobsResponse.json();
  assert.equal(initialData.rowsReceived, 200);
  assert.equal(initialData.rowsValid, 200);
  assert.equal(initialData.rejectedRows, 0);
  assert.equal(initialData.latestObservationDate, "2026-08-01");
  assert.equal(initialData.observations.at(-1).u_rate, 2.9);
  assert.equal(jobs.length, 50);

  await page.getByRole("heading", { name: "The labour force, month by month." }).waitFor();
  assert.equal(await page.locator(".mi-metric").count(), 7);
  assert.match(await page.locator(".mi-metric-u_rate").innerText(), /2\.9/);
  assert.match(await page.locator(".mi-sample-count").innerText(), /50/);
  assert.match(await page.locator(".mi-date-stat").innerText(), /0\s*\/\s*50/);
  assert.match(await page.locator(".mi-category-list").innerText(), /Mechanical[\s\S]*12/);
  assert.match(await page.locator(".mi-skill-soft").innerText(), /Communication[\s\S]*20/);
  assert.match(await page.locator(".mi-research-card").innerText(), /Not a live feed/);
  assert.match(await page.locator(".mi-research-card").innerText(), /2,000/);
  console.log("PASS: live data, all seven indicators, the 50-record snapshot, and dated research render");

  const windowSelect = page.getByLabel("Select chart time window");
  await windowSelect.selectOption("all");
  assert.match(await page.locator(".mi-chart").getAttribute("aria-label"), /Census 2020.*marked/);
  await windowSelect.selectOption("12");
  assert.doesNotMatch(await page.locator(".mi-chart").getAttribute("aria-label"), /Census 2020.*marked/);
  console.log("PASS: chart window and Census reference marker match the selected observations");

  await page.locator(".mi-source-details > summary").click();
  assert.match(await page.locator(".mi-source-grid").innerText(), /09 Oct 2026, 12:30/);
  assert.match(await page.locator(".mi-source-grid").innerText(), /11 Nov 2026, 12:30/);

  const refreshResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/future-ready/labour-market/refresh") &&
      response.request().method() === "POST",
  );
  await page.locator(".mi-refresh").click();
  const refreshResponse = await refreshResponsePromise;
  assert.equal(refreshResponse.status(), 200);
  const refreshedData = await refreshResponse.json();
  assert.equal(refreshedData.cacheState, "fresh");
  assert.equal(refreshedData.rowsValid, 200);
  assert.equal(refreshedData.latestObservationDate, "2026-08-01");
  assert.notEqual(refreshedData.retrievedAt, initialData.retrievedAt);
  await page.getByRole("status").filter({ hasText: "refreshed from the source" }).waitFor();
  console.log("PASS: manual refresh reaches the API and updates the page with a fresh response");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  assert.ok(widths.content <= widths.viewport + 1, `Horizontal overflow at mobile width: ${JSON.stringify(widths)}`);
  assert.equal(errors.length, 0, `Browser errors: ${errors.join("; ")}`);
  console.log("PASS: mobile viewport has no horizontal overflow or browser errors");
} finally {
  await context.close();
  await browser.close();
}
