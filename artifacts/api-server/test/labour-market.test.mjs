import assert from "node:assert/strict";
import test from "node:test";
import {
  createLabourMarketRepository,
  LABOUR_MARKET_CACHE_TTL_MS,
  parseLabourMarketCsv,
  parseOpenDosmCatalogueMetadata,
} from "../src/lib/labour-market.ts";

const header = "date,lf,lf_employed,lf_unemployed,lf_outside,p_rate,ep_ratio,u_rate";
const row = (date, lf, employed, unemployed, outside, participation, employment, rate) =>
  [date, lf, employed, unemployed, outside, participation, employment, rate].join(",");
const csv = [
  header,
  row("2025-08-01", 17203.5, 16684.5, 519, 7106.3, 70.8, 68.6, 3),
  row("2026-08-01", 17386, 16874.4, 511.6, 7106, 71, 68.9, 2.9),
  row("2026-07-01", 17365.9, 16845.6, 520.3, 7110.5, 70.9, 68.8, 3),
].join("\n");
const catalogueHtml = `
  <h5>Last updated: </h5><p>09 Oct 2026, 12:30</p>
  <h5>Next update:</h5><p>11 Nov 2026, 12:30</p>`;

test("CSV parser uses source columns, validates rows, and sorts by observation date", () => {
  const parsed = parseLabourMarketCsv(csv);
  assert.equal(parsed.rowsReceived, 3);
  assert.equal(parsed.rowsValid, 3);
  assert.equal(parsed.rejectedRows, 0);
  assert.equal(parsed.observations[0].date, "2025-08-01");
  assert.equal(parsed.observations.at(-1).date, "2026-08-01");
  assert.equal(parsed.observations.at(-1).lf, 17386);
  assert.equal(parsed.observations.at(-1).u_rate, 2.9);
});

test("invalid, duplicate, and incomplete rows are counted rather than silently used", () => {
  const sample = [
    `${header},new_field`,
    `${row("2026-08-01", 17386, 16874.4, 511.6, 7106, 71, 68.9, 2.9)},extra`,
    `${row("2026-08-01", 17386, 16874.4, 511.6, 7106, 71, 68.9, 2.9)},duplicate`,
    `${row("2026-09-01", 1, 1, 0, 0, 101, 99, 0)},invalid-rate`,
    "2026-10-01,1,1,,0,60,50,10,missing-value",
  ].join("\n");
  const parsed = parseLabourMarketCsv(sample);
  assert.equal(parsed.rowsReceived, 4);
  assert.equal(parsed.rowsValid, 1);
  assert.equal(parsed.rejectedRows, 3);
  assert.deepEqual(parsed.ignoredColumns, ["new_field"]);
  assert.throws(() => parseLabourMarketCsv("date,lf\n2026-01-01,10"), /missing required columns/);
  assert.throws(() => parseLabourMarketCsv(""), /empty/);
});

test("catalogue timestamps are parsed separately from dataset observation dates", () => {
  assert.deepEqual(parseOpenDosmCatalogueMetadata(catalogueHtml), {
    catalogueLastUpdated: "09 Oct 2026, 12:30",
    catalogueNextUpdate: "11 Nov 2026, 12:30",
  });
  assert.deepEqual(parseOpenDosmCatalogueMetadata("<html>date unavailable</html>"), {
    catalogueLastUpdated: null,
    catalogueNextUpdate: null,
  });
});

test("repository caches successful retrievals, forces refresh, and preserves stale data on failure", async () => {
  let currentTime = new Date("2026-10-24T00:00:00.000Z");
  let csvFails = false;
  let requestCount = 0;
  const fetcher = async (url) => {
    requestCount += 1;
    if (url.endsWith(".csv") && csvFails) return new Response("Unavailable", { status: 503 });
    return new Response(url.endsWith(".csv") ? csv : catalogueHtml, { status: 200 });
  };
  const repository = createLabourMarketRepository(fetcher, () => currentTime);

  const first = await repository.getData();
  assert.equal(first.cacheState, "fresh");
  assert.equal(first.retrievalMode, "external-fetch");
  assert.equal(first.latestObservationDate, "2026-08-01");
  assert.equal(first.catalogueLastUpdated, "09 Oct 2026, 12:30");
  assert.equal(requestCount, 2);

  currentTime = new Date(currentTime.getTime() + 60_000);
  const cacheHit = await repository.getData();
  assert.equal(cacheHit.retrievedAt, first.retrievedAt);
  assert.equal(cacheHit.retrievalMode, "cache-hit");
  assert.equal(requestCount, 2);

  const refreshed = await repository.getData(true);
  assert.equal(refreshed.retrievalMode, "external-fetch");
  assert.notEqual(refreshed.retrievedAt, first.retrievedAt);
  assert.equal(requestCount, 4);

  currentTime = new Date(currentTime.getTime() + 60_000);
  csvFails = true;
  const stale = await repository.getData(true);
  assert.equal(stale.cacheState, "stale");
  assert.equal(stale.retrievalMode, "stale-cache");
  assert.equal(stale.retrievedAt, refreshed.retrievedAt);
  assert.match(stale.refreshError, /HTTP 503/);

  const cooldown = await repository.getData();
  assert.equal(cooldown.cacheState, "stale");
  assert.equal(cooldown.retrievalMode, "stale-cache");
  assert.equal(requestCount, 6);

  currentTime = new Date(currentTime.getTime() + 5 * 60_000 + 1);
  csvFails = false;
  const retriedAfterCooldown = await repository.getData();
  assert.equal(retriedAfterCooldown.retrievalMode, "external-fetch");
  assert.equal(retriedAfterCooldown.cacheState, "fresh");
  assert.equal(requestCount, 8);
});

test("initial source failure is an error, and concurrent retrievals share one request", async () => {
  const unavailable = createLabourMarketRepository(async () => new Response("Unavailable", { status: 503 }));
  await assert.rejects(unavailable.getData(), /HTTP 503/);

  let requestCount = 0;
  const fetcher = async (url) => {
    requestCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return new Response(url.endsWith(".csv") ? csv : catalogueHtml);
  };
  const repository = createLabourMarketRepository(fetcher);
  const [one, two] = await Promise.all([repository.getData(), repository.getData()]);
  assert.equal(one.retrievalMode, "external-fetch");
  assert.equal(one.retrievedAt, two.retrievedAt);
  assert.equal(requestCount, 2);
});
