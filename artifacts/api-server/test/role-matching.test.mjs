import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { hasUnexpectedMatchInputFields, matchRoles } from "../src/lib/role-matching.ts";
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
    assert.deepEqual(result.matchedSkills.map(({ sdg, matchType, scoreCategory, ...skill }) => skill), expected.matchedSkills);
    assert.deepEqual(result.skillGaps.map(({ sdg, matchType, scoreCategory, ...skill }) => skill), expected.missingSkills);
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

test("Senior Data Analyst example reconciles 40 profile names, category coverage, and the 59.7% weighted score", () => {
  const job = jobs.find((entry) => entry.id === "J46");
  assert.ok(job);
  const matchedSkills = ["Power BI", "MySQL", "Excel", "Critical thinking", "Problem-solving"];
  const unrelatedSkills = Array.from({ length: 35 }, (_, index) => `Unrelated profile skill ${index + 1}`);
  const response = matchRoles([job], [...matchedSkills, ...unrelatedSkills]);
  const result = response.results[0];
  const byCategory = Object.fromEntries(result.scoreBreakdown.map((item) => [item.category, item]));

  assert.equal(result.requiredCount, 9);
  assert.equal(result.matchedCount, 5);
  assert.equal(result.skillCoverage, 55.6);
  assert.deepEqual(
    ["technical", "digital", "soft"].map((category) => [
      byCategory[category].matchedCount,
      byCategory[category].requiredCount,
      byCategory[category].coverage,
    ]),
    [[2, 5, 40], [1, 1, 100], [2, 3, 66.7]],
  );
  assert.equal(response.inputSkillCount, 40);
  assert.equal(result.overallScore, 59.7);
  assert.equal(result.experienceFit.requirementType, "preferred");
  assert.equal(result.experienceFit.suitabilityScore, null);
  assert.equal(byCategory.experience.status, "not-scorable");
  assert.equal(
    result.scoreBreakdown.filter((item) => item.status === "scored")
      .reduce((sum, item) => sum + item.effectiveWeight, 0),
    100,
  );
  assert.ok(Math.abs(
    result.scoreBreakdown.reduce((sum, item) => sum + (item.contribution ?? 0), 0)
      - result.overallScore,
  ) < 0.001);
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
  const profile = { relevantExperienceYears: 0, educationLevel: "Bachelor’s degree" };
  const result = matchRoles([ranged], ["Communication"], profile).results[0];
  assert.equal(result.job.salaryText, "3500-4999");
  assert.equal(result.job.salaryMonthlyRm, null);
  const changedSalary = { ...ranged, salaryText: "999999", salaryMonthlyRm: 999999 };
  const changedResult = matchRoles([changedSalary], ["Communication"], profile).results[0];
  assert.equal(changedResult.score, result.score);
  assert.equal(changedResult.overallScore, result.overallScore);
  assert.equal(changedResult.compatibilityTier, result.compatibilityTier);
  assert.equal(matchRoles([jobs.find((job) => job.id === "J43")], []).results[0].job.source, "");
});

test("all role and requirement mappings expose coherent mapped, reviewed, or unassessed states", () => {
  const result = matchRoles(jobs, ["PHP", "Communication"]);
  const titles = {
    4: "Quality Education", 5: "Gender Equality", 8: "Decent Work and Economic Growth",
    9: "Industry, Innovation and Infrastructure", 12: "Responsible Consumption and Production",
  };
  assert.deepEqual(SDG_GOALS, titles);
  for (const row of result.results) {
    for (const assessment of [row.roleSdg, ...row.matchedSkills.map((s) => s.sdg), ...row.skillGaps.map((s) => s.sdg)]) {
      assert.ok(["mapped", "review_required", "not_assessed"].includes(assessment.status));
      assert.equal(assessment.connections.length > 0, assessment.status === "mapped");
      assert.equal(assessment.reviewRequired, assessment.status === "review_required");
      assert.ok(assessment.assessmentNote);
      assert.equal(assessment.reviewReason !== null, assessment.status === "review_required");
      for (const connection of assessment.connections) {
        assert.equal(connection.title, titles[connection.goalNumber]);
        assert.equal(connection.url, `https://sdgs.un.org/goals/goal${connection.goalNumber}#targets_and_indicators`);
        assert.ok(connection.target.startsWith(`${connection.goalNumber}.`));
        assert.ok(connection.explanation.length > 60);
        assert.ok(connection.ruleId);
        assert.equal(connection.indicative, true);
        assert.ok(connection.conditions.length > 40);
        assert.ok([...row.job.technicalSkills, ...row.job.softSkills].includes(connection.evidence));
        for (const evidence of connection.contextEvidence) {
          assert.ok([...row.job.technicalSkills, ...row.job.softSkills].includes(evidence));
        }
      }
    }
  }
});

test("generic traits are flagged, not given unrelated goals; specific connections cite actual evidence", () => {
  assert.equal(mapSkillToSdgs("Positive attitude").reviewRequired, true);
  assert.equal(mapSkillToSdgs("An unfamiliar skill").status, "not_assessed");
  assert.equal(mapSkillToSdgs("Excel").status, "not_assessed");
  assert.equal(mapSkillToSdgs("Syntax").status, "not_assessed");
  assert.equal(mapSkillToSdgs("Model training").connections.some((item) => item.goalNumber === 4), false);
  assert.equal(mapSkillToSdgs("Recruitment").connections.some((item) => item.goalNumber === 5), false);
  assert.ok(mapSkillToSdgs("Inclusive recruitment and equal opportunities").connections.some((item) => item.goalNumber === 5));
  assert.ok(mapSkillToSdgs("Preventive maintenance").connections.some((item) => item.goalNumber === 12));
  assert.ok(mapSkillToSdgs("Mentoring").connections.some((item) => item.goalNumber === 4));
  assert.equal(mapRoleToSdgs(fixture("X", [])).reviewRequired, true);
});

test("spreadsheet and general skills get reusable conditional mappings only with actual source context", () => {
  const dataJob = { ...fixture("D", ["Data Analytics", "Excel", "Google Sheets"]), title: "Junior Data Analyst", softSkills: ["Communication", "Teamwork", "Problem-solving", "Attention to detail"] };
  for (const skill of [...dataJob.technicalSkills, ...dataJob.softSkills]) {
    const mapped = mapSkillToSdgs(skill, dataJob);
    assert.equal(mapped.status, "mapped", skill);
    assert.equal(mapped.connections[0].goalNumber, 9);
    assert.ok(mapped.connections[0].conditions.includes("research") || skill === "Data Analytics");
  }
  const excel = mapSkillToSdgs("Excel", dataJob).connections[0];
  const sheets = mapSkillToSdgs("Google Sheets", dataJob).connections[0];
  assert.equal(excel.ruleId, sheets.ruleId);
  assert.equal(excel.explanation, sheets.explanation);
  assert.equal(mapSkillToSdgs("  EXCEL  ", dataJob).connections[0].ruleId, excel.ruleId);
  const financeJob = fixture("F", ["Financial Reporting", "MS Excel"]);
  assert.equal(mapSkillToSdgs("MS Excel", financeJob).connections[0].goalNumber, 8);
  assert.equal(mapSkillToSdgs("Communication", financeJob).connections[0].target, "8.3");
});

test("role titles, industry labels, or generic tools alone cannot create a goal contribution", () => {
  const unsupported = { ...fixture("X", ["Excel", "Google Sheets"]), title: "Junior Data Analyst", industry: "Technology", softSkills: ["Communication", "Teamwork"] };
  assert.equal(mapRoleToSdgs(unsupported).status, "review_required");
  assert.equal(mapSkillToSdgs("Excel", unsupported).status, "review_required");
  assert.equal(mapSkillToSdgs("Communication", unsupported).status, "review_required");
  assert.equal(mapSkillToSdgs("An unfamiliar skill", unsupported).status, "not_assessed");
  assert.equal(mapSkillToSdgs("", { ...unsupported, title: "", industry: "", technicalSkills: [] }).status, "not_assessed");
});

test("curated vocabulary aliases resolve repeated source tools without rewriting evidence or scoring terms", () => {
  for (const name of ["MySQL", "HTML5", "CSS3", "GitLab", "Next.js", "Pandas"]) {
    const mapped = mapSkillToSdgs(name);
    assert.equal(mapped.status, "mapped", name);
    assert.equal(mapped.connections[0].goalNumber, 9);
    assert.equal(mapped.connections[0].evidence, name);
  }
  for (const name of ["General Ledger (GL)", "Accounts Payable", "IFRS"]) {
    assert.equal(mapSkillToSdgs(name).connections[0].goalNumber, 8);
  }
});

test("the real dataset includes mapped roles and a defensibly reviewed role without modifying its records", () => {
  const matched = matchRoles(jobs, []);
  const reviewRole = matched.results.find((row) => row.job.id === "J24");
  assert.equal(reviewRole.roleSdg.status, "review_required");
  assert.match(reviewRole.roleSdg.assessmentNote, /title and industry alone/i);
  const junior = matched.results.find((row) => row.job.id === "J43");
  assert.equal(junior.roleSdg.status, "review_required");
  assert.match(junior.roleSdg.assessmentNote, /GTM; DNS; PWA/);
  for (const row of matched.results.filter((r) => /data analyst/i.test(r.job.title) && r.job.id !== "J43")) {
    assert.equal(row.roleSdg.status, "mapped", row.job.id);
    assert.ok(row.roleSdg.connections.some((c) => c.goalNumber === 9), row.job.id);
  }
});

test("API contract handles empty skills and rejects oversized or malformed input", () => {
  assert.equal(MatchFutureReadyRolesBody.safeParse({ currentSkills: [] }).success, true);
  assert.equal(MatchFutureReadyRolesBody.safeParse({ currentSkills: ["SQL"] }).success, true);
  assert.equal(MatchFutureReadyRolesBody.safeParse({ currentSkills: ["SQL"], relevantExperienceYears: 0, educationLevel: "Bachelor’s degree" }).success, true);
  assert.equal(MatchFutureReadyRolesBody.safeParse({ currentSkills: ["SQL"], relevantExperienceYears: -1 }).success, false);
  assert.equal(MatchFutureReadyRolesBody.safeParse({ currentSkills: ["SQL"], relevantExperienceYears: 81 }).success, false);
  const oldTotalYearsRequest = { currentSkills: ["SQL"], experienceYears: 0 };
  assert.equal(MatchFutureReadyRolesBody.safeParse(oldTotalYearsRequest).success, true);
  assert.equal(hasUnexpectedMatchInputFields(oldTotalYearsRequest), true, "the HTTP route rejects total experience and other undeclared fields");
  assert.equal(hasUnexpectedMatchInputFields({ currentSkills: ["SQL"], relevantExperienceYears: 0 }), false);
  assert.equal(MatchFutureReadyRolesBody.safeParse({ currentSkills: ["SQL"], educationLevel: "x".repeat(81) }).success, false);
  assert.equal(MatchFutureReadyRolesBody.safeParse({ currentSkills: "SQL" }).success, false);
  assert.equal(MatchFutureReadyRolesBody.safeParse({ currentSkills: Array(151).fill("SQL") }).success, false);
  assert.equal(MatchFutureReadyRolesBody.safeParse({ currentSkills: ["x".repeat(101)] }).success, false);
});

test("real zero-experience profile gets entry and internship roles before a higher-overlap senior role", () => {
  const senior = jobs.find((job) => job.id === "J47");
  const profileSkills = [...senior.technicalSkills, ...senior.softSkills];
  const result = matchRoles(jobs, profileSkills, { relevantExperienceYears: 0, educationLevel: "Bachelor’s degree" });
  const intern = result.results.find((row) => row.job.id === "J45");
  const graduate = result.results.find((row) => row.job.id === "J43");
  const explicitSenior = result.results.find((row) => row.job.id === "J47");
  const unspecifiedSenior = result.results.find((row) => row.job.id === "J49");

  assert.equal(intern.experienceFit.roleLevel, "internship");
  assert.equal(intern.compatibilityTier, intern.skillCoverage >= 50 && intern.technicalCoverage >= 50 ? 1 : 2);
  assert.equal(graduate.experienceFit.requirementType, "explicit_none");
  assert.equal(graduate.compatibilityTier, graduate.skillCoverage >= 50 && graduate.technicalCoverage >= 50 ? 1 : 2);
  assert.equal(explicitSenior.experienceFit.requirementType, "mandatory");
  assert.equal(explicitSenior.experienceFit.sourceMinimumYears, 3);
  assert.equal(explicitSenior.compatibilityTier, 3);
  assert.equal(unspecifiedSenior.experienceFit.requirementType, "unavailable");
  assert.equal(unspecifiedSenior.experienceFit.guidelineYears, null);
  assert.notEqual(unspecifiedSenior.compatibilityTier, 3);
  assert.ok(result.results.indexOf(intern) < result.results.indexOf(explicitSenior));
  assert.ok(result.results.indexOf(graduate) < result.results.indexOf(explicitSenior));
  assert.ok(explicitSenior.skillCoverage > intern.skillCoverage);
  assert.equal(explicitSenior.score, explicitSenior.skillCoverage);
});

test("conditional education/experience paths are not collapsed into mandatory single thresholds", () => {
  const role = jobs.find((job) => job.id === "J21");
  const result = matchRoles([role], [], { relevantExperienceYears: 0, educationLevel: "Diploma" }).results[0];
  assert.equal(result.experienceFit.requirementType, "conditional");
  assert.equal(result.experienceFit.suitabilityScore, null);
  assert.equal(result.educationFit.requirementType, "conditional");
  assert.equal(result.educationFit.suitabilityScore, null);
  assert.equal(result.compatibilityTier, 2);
});

test("missing dimensions are excluded, remain visible, and do not become a confirmed mismatch", () => {
  const senior = jobs.find((job) => job.id === "J47");
  const skills = [...senior.technicalSkills, ...senior.softSkills];
  const result = matchRoles([senior], skills).results[0];
  assert.equal(result.skillCoverage, 100);
  assert.equal(result.overallScore, 100);
  assert.equal(result.experienceFit.suitabilityScore, null);
  assert.equal(result.experienceFit.status, "not_provided");
  assert.equal(result.educationFit.suitabilityScore, null);
  assert.equal(result.educationFit.status, "not_provided");
  assert.equal(result.compatibilityTier, 2);

  const noRequirements = { ...fixture("NO-SKILLS", []), title: "Unclassified role", experience: "Not specified", education: "" };
  const noScore = matchRoles([noRequirements], [], {}).results[0];
  assert.equal(noScore.skillCoverage, null);
  assert.equal(noScore.score, null);
  assert.equal(noScore.overallScore, null);
  assert.equal(noScore.compatibilityTier, 2);
});

test("ranking uses compatibility tier, then overall score, then skill coverage and ID deterministically", () => {
  const source = [
    { ...fixture("J10", ["PHP", "SQL"]), experience: "Minimum 5 years required" },
    fixture("J3", ["PHP", "SQL"]),
    fixture("J2", ["PHP", "SQL"]),
    fixture("J1", ["PHP"]),
  ];
  const input = { relevantExperienceYears: 0, educationLevel: "Bachelor’s degree" };
  const first = matchRoles(source, ["PHP"], input);
  assert.deepEqual(first.results.map((item) => item.job.id), ["J1", "J2", "J3", "J10"]);
  assert.deepEqual(matchRoles([...source].reverse(), ["PHP"], input), first);
});
