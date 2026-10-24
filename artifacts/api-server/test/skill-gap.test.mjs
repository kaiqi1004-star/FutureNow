import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calculateSkillGap } from "../src/lib/skill-gap.ts";

const jobs = JSON.parse(
  readFileSync(new URL("../data/jobs.json", import.meta.url), "utf8"),
);

function makeJob(overrides = {}) {
  return {
    id: "TEST-1",
    title: "Test role",
    company: "Test company",
    source: "Test source",
    industry: "Test industry",
    education: "",
    salaryMonthlyRm: null,
    experience: "",
    technicalSkills: [],
    softSkills: [],
    sector: "software",
    location: null,
    postingDate: null,
    sourceUrl: null,
    ...overrides,
  };
}

test("uses distinct listed requirements and the documented formula", () => {
  const job = makeJob({
    technicalSkills: ["HTML", "CSS", "JavaScript", "JS"],
    softSkills: ["Communication"],
  });
  const result = calculateSkillGap(job, ["HTML5", "JS", "unlisted skill"]);

  assert.equal(result.requiredCount, 4);
  assert.equal(result.matchedCount, 2);
  assert.equal(result.coveragePercent, 50);
  assert.deepEqual(result.matchedSkills.map((item) => item.skill), [
    "HTML",
    "JavaScript",
  ]);
  assert.deepEqual(result.unmatchedInputSkills, ["unlisted skill"]);
  assert.match(result.coverageFormula, /matched distinct listed requirements/i);
});

test("keeps unfamiliar inputs visible and does not equate unrelated skills", () => {
  const result = calculateSkillGap(
    makeJob({ technicalSkills: ["GitLab"] }),
    ["Git", "InventedSkill"],
  );

  assert.equal(result.matchedCount, 0);
  assert.deepEqual(result.unmatchedInputSkills, ["Git", "InventedSkill"]);
  assert.deepEqual(result.missingSkills.map((item) => item.skill), ["GitLab"]);
});

test("supports only the source's explicit at-least-one language requirement", () => {
  const requirement =
    "Java/Python/C#/JavaScript/TypeScript (at least one)";
  const result = calculateSkillGap(
    makeJob({ technicalSkills: [requirement] }),
    ["JavaScript"],
  );

  assert.equal(result.requiredCount, 1);
  assert.equal(result.matchedCount, 1);
  assert.equal(result.coveragePercent, 100);
  assert.equal(result.matchedSkills[0].skill, requirement);
  assert.equal(result.matchedSkills[0].matchedBy, "JavaScript");
});

test("orders known prerequisites first and preserves the source order for other gaps", () => {
  const result = calculateSkillGap(
    makeJob({
      technicalSkills: ["React", "JavaScript", "HTML", "CSS", "Docker"],
    }),
    [],
  );

  assert.deepEqual(
    result.roadmap.map((step) => step.skill),
    ["HTML", "CSS", "JavaScript", "React", "Docker"],
  );
  assert.equal(result.roadmap[0].step, 1);
  assert.equal(result.roadmap[0].estimatedHoursMin, 8);
  assert.match(result.estimateNote, /rough planning estimates/i);
});

test("adds explicitly selected listed skills to the roadmap without changing coverage", () => {
  const job = makeJob({
    technicalSkills: ["React", "JavaScript", "HTML"],
    softSkills: ["Communication"],
  });
  const comparison = calculateSkillGap(job, ["React"]);
  const planned = calculateSkillGap(job, ["React"], [
    "React JS",
    "not a listed requirement",
  ]);

  assert.equal(planned.matchedCount, comparison.matchedCount);
  assert.equal(planned.requiredCount, comparison.requiredCount);
  assert.equal(planned.coveragePercent, comparison.coveragePercent);
  assert.deepEqual(planned.missingSkills, comparison.missingSkills);
  assert.deepEqual(
    planned.roadmap.map((step) => step.skill),
    ["HTML", "JavaScript", "React", "Communication"],
  );
  assert.match(planned.roadmapNote, /not an employer priority/i);
});

test("counts soft-only listings and ignores missing experience or salary in coverage", () => {
  const job = makeJob({
    technicalSkills: [],
    softSkills: ["Communication", "Teamwork"],
    experience: "",
    salaryMonthlyRm: null,
  });
  const baseline = calculateSkillGap(job, ["Communication"]);
  const withContext = calculateSkillGap(
    {
      ...job,
      experience: "Minimum 5 years of relevant experience",
      salaryMonthlyRm: 12000,
    },
    ["Communication"],
  );

  assert.equal(baseline.requiredCount, 2);
  assert.equal(baseline.matchedCount, 1);
  assert.equal(baseline.coveragePercent, 50);
  assert.deepEqual(baseline.matchedSkills, withContext.matchedSkills);
  assert.deepEqual(baseline.missingSkills, withContext.missingSkills);
  assert.equal(baseline.coveragePercent, withContext.coveragePercent);
});

test("empty input yields zero coverage and every listed skill as a gap", () => {
  const job = jobs.find((item) => item.id === "J1");
  const result = calculateSkillGap(job, []);

  assert.ok(result.requiredCount > 0);
  assert.equal(result.matchedCount, 0);
  assert.equal(result.coveragePercent, 0);
  assert.equal(result.missingSkills.length, result.requiredCount);
  assert.deepEqual(result.unmatchedInputSkills, []);
});

test("handles software and mechanical roles with either salary disclosure state", () => {
  for (const sector of ["software", "mechanical"]) {
    for (const disclosed of [true, false]) {
      const job = jobs.find(
        (item) =>
          item.sector === sector &&
          (item.salaryMonthlyRm !== null) === disclosed,
      );
      assert.ok(job, `expected a ${sector} job with disclosed=${disclosed}`);

      const result = calculateSkillGap(job, [job.technicalSkills[0]]);
      const expected =
        Math.round((1 / result.requiredCount) * 1000) / 10;

      assert.equal(result.selectedJob.id, job.id);
      assert.equal(result.selectedJob.salaryMonthlyRm, job.salaryMonthlyRm);
      assert.equal(result.matchedCount, 1);
      assert.equal(result.coveragePercent, expected);
    }
  }
});

test("does not include salary in the skill calculation", () => {
  const job = jobs.find(
    (item) => item.sector === "software" && item.salaryMonthlyRm !== null,
  );
  const disclosed = calculateSkillGap(job, ["HTML"]);
  const undisclosed = calculateSkillGap(
    { ...job, salaryMonthlyRm: null },
    ["HTML"],
  );

  assert.equal(disclosed.coveragePercent, undisclosed.coveragePercent);
  assert.deepEqual(disclosed.matchedSkills, undisclosed.matchedSkills);
  assert.deepEqual(disclosed.missingSkills, undisclosed.missingSkills);
});

test("returns no percentage when a future job record lists no skills", () => {
  const result = calculateSkillGap(makeJob(), []);

  assert.equal(result.requiredCount, 0);
  assert.equal(result.coveragePercent, null);
  assert.deepEqual(result.roadmap, []);
});
