import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { matchRoles } from "../src/lib/role-matching.ts";
import { calculateSkillGap } from "../src/lib/skill-gap.ts";
import { mapSkillToSdgs, mapRoleToSdgs, SDG_GOALS } from "../src/lib/sdg-mapping.ts";
import { MatchFutureReadyRolesBody, MatchFutureReadyRolesResponse } from "../../../lib/api-zod/src/generated/api.ts";

const jobs = JSON.parse(readFileSync(new URL("../data/jobs.json", import.meta.url), "utf8"));
const fixture = (id, skills) => ({
  ...jobs[0], id, technicalSkills: skills, softSkills: [],
});

test("matching returns each real source record exactly once without mutating job facts", () => {
  const before = structuredClone(jobs);
  const result = matchRoles(jobs, ["PHP", "Laravel", "Problem-solving"]);
  assert.equal(result.totalJobs, jobs.length);
  assert.equal(result.results.length, 50);
  assert.equal(new Set(result.results.map((item) => item.job.id)).size, 50);
  for (const item of result.results) {
    assert.deepEqual(item.job, jobs.find((job) => job.id === item.job.id));
  }
  assert.deepEqual(jobs, before);
  assert.deepEqual(MatchFutureReadyRolesResponse.parse(result), result);
});

test("each score and matched/gap contribution reuses the documented distinct-skill formula", () => {
  const input = ["Laravel", "PHP", "problem solving", "Unfamiliar tool"];
  for (const result of matchRoles(jobs, input).results) {
    const expected = calculateSkillGap(result.job, input);
    assert.equal(result.score, expected.coveragePercent);
    assert.equal(result.matchedCount + result.skillGaps.length, result.requiredCount);
    assert.equal(result.matchedCount, result.matchedSkills.length);
    assert.deepEqual(result.matchedSkills.map(({ sdg, ...skill }) => skill), expected.matchedSkills);
    assert.deepEqual(result.skillGaps.map(({ sdg, ...skill }) => skill), expected.missingSkills);
  }
});

test("ranking is deterministic by unrounded coverage then numeric record ID, unavailable last", () => {
  const source = [
    fixture("J10", ["PHP", "SQL"]), fixture("J3", []),
    fixture("J2", ["PHP", "SQL"]), fixture("J1", ["PHP"]),
  ];
  const result = matchRoles(source, ["PHP"]);
  assert.deepEqual(result.results.map((item) => item.job.id), ["J1", "J2", "J10", "J3"]);
  assert.deepEqual(result.results.map((item) => item.score), [100, 50, 50, null]);
  assert.deepEqual(matchRoles([...source].reverse(), ["PHP"]), result);
});

test("aliases and duplicate profile skill names never inflate coverage or imply specific tools", () => {
  const job = fixture("J1", ["JavaScript", "JS", "Laravel"]);
  const result = matchRoles([job], ["JS", "javascript", "JS", "Programming"]).results[0];
  assert.equal(result.requiredCount, 2);
  assert.equal(result.matchedCount, 1);
  assert.equal(result.score, 50);
  assert.equal(result.skillGaps[0].skill, "Laravel");
});

test("empty input, blank names, no requirements and unknown fields remain safe", () => {
  const empty = matchRoles(jobs, [" ", ""]);
  assert.equal(empty.inputSkillCount, 0);
  assert.ok(empty.results.every((item) => item.score === 0 || item.score === null));
  const sparse = { ...fixture("X", []), company: "", experience: "", source: "", sourceUrl: null, salaryMonthlyRm: null, salaryText: undefined };
  const result = matchRoles([sparse], []).results[0];
  assert.equal(result.score, null);
  assert.equal(result.roleSdg.reviewRequired, true);
  assert.equal(result.job.sourceUrl, null);
  assert.match(result.improvement, /no skills/i);
});

test("salary bands and blank source names survive; salary/category never affect skill scores", () => {
  const ranged = jobs.find((job) => job.id === "J36");
  const result = matchRoles([ranged], ["Communication"]).results[0];
  assert.equal(result.job.salaryText, "3500-4999");
  assert.equal(result.job.salaryMonthlyRm, null);
  const changedContext = { ...ranged, salaryText: "999999", salaryMonthlyRm: 999999, sector: "software" };
  assert.equal(matchRoles([changedContext], ["Communication"]).results[0].score, result.score);
  assert.equal(matchRoles([jobs.find((job) => job.id === "J43")], []).results[0].job.source, "");
});

test("all role and requirement mappings are explained valid SDGs or explicitly flagged", () => {
  const result = matchRoles(jobs, ["PHP", "Communication"]);
  const titles = {
    4: "Quality Education", 5: "Gender Equality", 8: "Decent Work and Economic Growth",
    9: "Industry, Innovation and Infrastructure", 12: "Responsible Consumption and Production",
  };
  assert.deepEqual(SDG_GOALS, titles);
  for (const row of result.results) {
    for (const assessment of [row.roleSdg, ...row.matchedSkills.map((s) => s.sdg), ...row.skillGaps.map((s) => s.sdg)]) {
      assert.ok(assessment.connections.length > 0 || (assessment.reviewRequired && assessment.reviewReason));
      assert.equal(assessment.reviewRequired, assessment.connections.length === 0);
      for (const connection of assessment.connections) {
        assert.equal(connection.title, titles[connection.goalNumber]);
        assert.equal(connection.url, `https://sdgs.un.org/goals/goal${connection.goalNumber}#targets_and_indicators`);
        assert.ok(connection.target.startsWith(`${connection.goalNumber}.`));
        assert.ok(connection.explanation.length > 60);
        assert.ok(connection.ruleId);
        assert.ok([...row.job.technicalSkills, ...row.job.softSkills].includes(connection.evidence));
      }
    }
  }
});

test("generic traits are flagged, not given unrelated goals; specific connections cite actual evidence", () => {
  assert.equal(mapSkillToSdgs("Positive attitude").reviewRequired, true);
  assert.equal(mapSkillToSdgs("An unfamiliar skill").reviewRequired, true);
  assert.equal(mapSkillToSdgs("Excel").reviewRequired, true);
  assert.equal(mapSkillToSdgs("Syntax").reviewRequired, true);
  assert.equal(mapSkillToSdgs("Model training").connections.some((item) => item.goalNumber === 4), false);
  assert.equal(mapSkillToSdgs("Recruitment").connections.some((item) => item.goalNumber === 5), false);
  assert.ok(mapSkillToSdgs("Inclusive recruitment and equal opportunities").connections.some((item) => item.goalNumber === 5));
  assert.ok(mapSkillToSdgs("Preventive maintenance").connections.some((item) => item.goalNumber === 12));
  assert.ok(mapSkillToSdgs("Mentoring").connections.some((item) => item.goalNumber === 4));
  assert.equal(mapRoleToSdgs([]).reviewRequired, true);
});

test("API contract handles empty skills and rejects oversized or malformed input", () => {
  assert.equal(MatchFutureReadyRolesBody.safeParse({ currentSkills: [] }).success, true);
  assert.equal(MatchFutureReadyRolesBody.safeParse({ currentSkills: ["SQL"] }).success, true);
  assert.equal(MatchFutureReadyRolesBody.safeParse({ currentSkills: "SQL" }).success, false);
  assert.equal(MatchFutureReadyRolesBody.safeParse({ currentSkills: Array(151).fill("SQL") }).success, false);
  assert.equal(MatchFutureReadyRolesBody.safeParse({ currentSkills: ["x".repeat(101)] }).success, false);
});
