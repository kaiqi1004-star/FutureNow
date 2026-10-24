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
  assert.ok(["external-fetch", "cache-hit"].includes(initialData.retrievalMode));
  assert.equal(typeof initialData.retrievedAt, "string");
  assert.equal(jobs.length, 50);

  await page.getByRole("heading", { name: "Understand Malaysia's changing world of work." }).waitFor();
  await page.getByRole("heading", { name: "Key findings" }).waitFor();
  assert.equal(await page.locator(".mi-overview-card").count(), 3);
  assert.match(await page.locator('[data-testid="mi-overview-market"]').innerText(), /Unemployment rate in/);
  assert.match(await page.locator('[data-testid="mi-overview-records"]').innerText(), /of 50 supplied job records/);
  assert.match(await page.locator('[data-testid="mi-overview-research"]').innerText(), /2,000/);
  assert.match(await page.locator('[data-testid="mi-overview-research"]').innerText(), /69%/);
  assert.equal(await page.locator('details[data-testid="details-official-source"]').evaluate((element) => element.open), false);
  assert.equal(await page.locator('details[data-testid="details-job-source"]').evaluate((element) => element.open), false);
  assert.equal(await page.locator(".mi-metric").count(), 7);
  assert.match(await page.locator(".mi-metric-u_rate").innerText(), /2\.9/);
  assert.match(await page.locator(".mi-metric-lf").innerText(), /million people/);
  assert.match(await page.locator(".mi-sample-count").innerText(), /50/);
  assert.match(await page.locator(".mi-date-stat").innerText(), /0\s*\/\s*50/);
  assert.match(await page.locator(".mi-category-list").innerText(), /Mechanical[\s\S]*12/);
  assert.match(await page.locator(".mi-skill-soft").innerText(), /Communication[\s\S]*20/);
  assert.match(await page.locator(".mi-skill-technical").innerText(), /Excel[\s\S]*9/);
  assert.match(await page.locator(".mi-skill-domain").innerText(), /Payroll[\s\S]*6/);
  assert.doesNotMatch(await page.locator(".mi-skill-technical").innerText(), /Payroll/);
  assert.match(await page.locator(".mi-research-card").innerText(), /Microsoft/);
  assert.match(await page.locator(".mi-research-card").innerText(), /2,000/);
  assert.match(await page.locator(".mi-research-card").innerText(), /23 June 2026/);
  assert.match(await page.locator(".mi-research-card").innerText(), /knowledge workers in Malaysia/);
  assert.match(await page.locator(".mi-interpretation").innerText(), /What changed\?/);
  assert.match(await page.locator(".mi-interpretation").innerText(), /4\.6%/);
  assert.equal(await page.locator(".mi-data-meta").isVisible(), false);
  assert.match(await page.locator(".mi-chart-head").innerText(), /People, in millions/);
  assert.match(await page.locator(".mi-chart").getAttribute("aria-label"), /million people/);

  await page.locator('details[data-testid="details-official-source"] > summary').click();
  assert.match(await page.locator(".mi-source-grid").innerText(), /09 Oct 2026, 12:30/);
  assert.match(await page.locator(".mi-source-grid").innerText(), /11 Nov 2026, 12:30/);
  assert.match(await page.locator(".mi-data-meta").innerText(), /Latest Official Data/);
  assert.match(await page.locator(".mi-data-meta").innerText(), /Last successful CSV retrieval/);
  assert.match(await page.locator(".mi-data-meta").innerText(), /API cache/);
  assert.match(await page.locator(".mi-data-meta").innerText(), /MYT/);
  assert.match(await page.locator('details[data-testid="details-official-source"] .mi-detail-method').innerText(), /thousand persons/);
  console.log("PASS: evidence overview, source-specific live data, 50-record snapshot, and dated research render");

  const windowSelect = page.getByLabel("Select chart time window");
  await windowSelect.selectOption("all");
  assert.match(await page.locator(".mi-chart").getAttribute("aria-label"), /Census 2020.*marked/);
  await windowSelect.selectOption("12");
  assert.doesNotMatch(await page.locator(".mi-chart").getAttribute("aria-label"), /Census 2020.*marked/);
  console.log("PASS: chart window and Census reference marker match the selected observations");

  await page.locator('details[data-testid="details-job-source"] > summary').click();
  assert.match(await page.locator(".mi-job-details").innerText(), /Excel groups Excel and Microsoft Excel/);
  assert.equal(await page.locator('.mi-job-source-link a').getAttribute("href"), "/jobs");

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
  assert.equal(refreshedData.retrievalMode, "external-fetch");
  assert.equal(refreshedData.rowsValid, 200);
  assert.equal(refreshedData.latestObservationDate, "2026-08-01");
  assert.notEqual(refreshedData.retrievedAt, initialData.retrievedAt);
  await page.getByRole("status").filter({ hasText: "Values may be unchanged" }).waitFor();
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
