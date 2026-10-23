import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { GetFutureReadyJobsResponse } from "../../../lib/api-zod/src/generated/api.ts";

const jobs = JSON.parse(readFileSync(new URL("../data/jobs.json", import.meta.url), "utf8"));

test("all 50 records pass the generated API schema without dropping fields", () => {
  assert.equal(jobs.length, 50);
  assert.deepEqual(GetFutureReadyJobsResponse.parse(jobs), jobs);
  assert.deepEqual(jobs.map((job) => job.id), Array.from({ length: 50 }, (_, i) => `J${i + 1}`));
  assert.equal(new Set(jobs.map((job) => job.id)).size, 50);
});

test("every imported field matches the authoritative workbook conversion", () => {
  const script = fileURLToPath(new URL("../../../scripts/src/import-sdc-jobs.py", import.meta.url));
  const result = spawnSync("python3", [script, "--check"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const audit = JSON.parse(result.stdout);
  assert.equal(audit.records, 50);
  assert.equal(audit.rejectedRows, 0);
  assert.deepEqual(audit.categories, {
    software: 12, mechanical: 12, "digital-marketing": 6,
    "human-resources": 6, "accounting-finance": 6, "data-analytics": 8,
  });
});

test("source corrections, URLs, and intentionally blank source names are preserved", () => {
  assert.match(jobs.find((job) => job.id === "J22").title, /Mechanical Design Engineer/);
  assert.match(jobs.find((job) => job.id === "J23").title, /Mechanical Design Engineer/);
  assert.equal(jobs.filter((job) => job.source === "").length, 8);
  assert.equal(jobs.filter((job) => /^https?:\/\//.test(job.sourceUrl)).length, 50);
  assert.equal(jobs.find((job) => job.id === "J36").salaryText, "3500-4999");
});
