import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { JobListing, LabourMarketObservation } from "@workspace/api-client-react";
import {
  buildLabourMarketIndicators,
  buildSuppliedJobSnapshot,
  selectLabourMarketWindow,
} from "./market-intelligence-model.ts";

const jobs = JSON.parse(
  readFileSync(new URL("../../../api-server/data/jobs.json", import.meta.url), "utf8"),
) as JobListing[];

const observations: LabourMarketObservation[] = [
  { date: "2025-08-01", lf: 17203.5, lf_employed: 16684.5, lf_unemployed: 519, lf_outside: 7106.3, p_rate: 70.8, ep_ratio: 68.6, u_rate: 3 },
  { date: "2026-08-01", lf: 17386, lf_employed: 16874.4, lf_unemployed: 511.6, lf_outside: 7106, p_rate: 71, ep_ratio: 68.9, u_rate: 2.9 },
  { date: "2026-07-01", lf: 17365.9, lf_employed: 16845.6, lf_unemployed: 520.3, lf_outside: 7110.5, p_rate: 70.9, ep_ratio: 68.8, u_rate: 3 },
];

test("latest observations and comparisons use exact previous calendar months", () => {
  const indicators = buildLabourMarketIndicators(observations);
  const unemployment = indicators.find((metric) => metric.key === "u_rate");
  const employed = indicators.find((metric) => metric.key === "lf_employed");

  assert.equal(unemployment?.value, 2.9);
  assert.deepEqual(unemployment?.monthOverMonth, {
    date: "2026-07-01",
    value: 3,
    change: -0.1,
    unit: "percentage points",
  });
  assert.equal(unemployment?.yearOverYear?.date, "2025-08-01");
  assert.equal(unemployment?.yearOverYear?.change, -0.1);
  assert.equal(employed?.monthOverMonth?.change, 28.8);
  assert.equal(employed?.monthOverMonth?.unit, "thousand persons");
});

test("missing calendar comparison periods stay unavailable instead of using a nearby month", () => {
  const indicators = buildLabourMarketIndicators([
    observations[0]!,
    observations[1]!,
  ]);
  const unemployment = indicators.find((metric) => metric.key === "u_rate");
  assert.equal(unemployment?.monthOverMonth, null);
  assert.equal(unemployment?.yearOverYear?.date, "2025-08-01");
});

test("chart windows are chosen from real monthly observations and sorted by date", () => {
  const selected = selectLabourMarketWindow(observations, 12);
  assert.deepEqual(selected.map((row) => row.date), ["2026-07-01", "2026-08-01"]);
  assert.deepEqual(selectLabourMarketWindow(observations, "all").map((row) => row.date), [
    "2025-08-01", "2026-07-01", "2026-08-01",
  ]);
});

test("supplied-job statistics are computed per record and disclose missing posting dates", () => {
  const snapshot = buildSuppliedJobSnapshot(jobs);
  assert.equal(snapshot.totalRecords, 50);
  assert.equal(snapshot.distinctTitles, 25);
  assert.deepEqual(
    Object.fromEntries(snapshot.categories.map(({ key, count }) => [key, count])),
    {
      software: 12,
      mechanical: 12,
      "data-analytics": 8,
      "accounting-finance": 6,
      "digital-marketing": 6,
      "human-resources": 6,
    },
  );
  assert.equal(snapshot.jobsWithoutPostingDates, 50);
  assert.equal(snapshot.jobsWithPostingDates, 0);
  assert.equal(snapshot.topSoftSkills[0]?.name, "Communication");
  assert.equal(snapshot.topSoftSkills[0]?.jobCount, 20);
  assert.equal(snapshot.topTechnicalSkills.find((skill) => skill.name.toLowerCase() === "sql")?.jobCount, 6);
});
