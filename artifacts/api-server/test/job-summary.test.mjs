import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildFutureReadyOverview } from "../src/lib/job-summary.ts";

const jobs = JSON.parse(
  readFileSync(new URL("../data/jobs.json", import.meta.url), "utf8"),
);

test("loaded job records have unique IDs and valid sector and skill fields", () => {
  const ids = jobs.map((job) => job.id);

  assert.equal(new Set(ids).size, jobs.length);
  for (const job of jobs) {
    assert.ok(job.id.trim());
    assert.ok(job.title.trim());
    assert.ok(job.company.trim());
    assert.ok(["software", "mechanical"].includes(job.sector));
    assert.ok(Array.isArray(job.technicalSkills));
    assert.ok(Array.isArray(job.softSkills));
  }
});

test("overview totals and disclosure notes match the loaded dataset", () => {
  const summary = buildFutureReadyOverview(jobs);
  const disclosedSalaryCount = jobs.filter(
    (job) => job.salaryMonthlyRm !== null,
  ).length;
  const undisclosedSalaryCount = jobs.length - disclosedSalaryCount;

  assert.equal(summary.totalJobs, jobs.length);
  assert.equal(
    summary.softwareJobs + summary.mechanicalJobs,
    jobs.length,
  );
  assert.equal(summary.disclosedSalaryCount, disclosedSalaryCount);
  assert.equal(summary.undisclosedSalaryCount, undisclosedSalaryCount);
  assert.match(summary.dataNotes[0], new RegExp(`${jobs.length}-record sample`));
  assert.ok(summary.dataNotes[1].includes(`${undisclosedSalaryCount} record`));
});

test("overview counts respond to the input size instead of a fixed count", () => {
  for (const subset of [jobs.slice(0, 1), jobs.slice(0, 7), jobs]) {
    const summary = buildFutureReadyOverview(subset);

    assert.equal(summary.totalJobs, subset.length);
    assert.equal(
      summary.softwareJobs + summary.mechanicalJobs,
      subset.length,
    );
    assert.match(
      summary.dataNotes[0],
      new RegExp(`${subset.length}-record sample`),
    );
  }
});
