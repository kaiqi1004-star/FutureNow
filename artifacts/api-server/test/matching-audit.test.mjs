import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { matchRoles } from "../src/lib/role-matching.ts";
import { skillMatchType } from "../src/lib/skill-gap.ts";
import { resolveDataDirectory } from "../src/lib/data-directory.ts";

const jobs = JSON.parse(readFileSync(new URL("../data/jobs.json", import.meta.url), "utf8"));
const get = (id) => jobs.find((job) => job.id === id);
const profile = { relevantExperienceYears: 0, educationLevel: "Bachelor’s degree" };

test("data lookup works from workspace root, service directory and bundled module location", () => {
  const cwd = process.cwd();
  try {
    for (const url of [new URL("../../../", import.meta.url), new URL("../", import.meta.url)]) {
      process.chdir(fileURLToPath(url));
      const directory = resolveDataDirectory();
      assert.equal(JSON.parse(readFileSync(`${directory}/jobs.json`, "utf8")).length, 50);
      assert.equal(resolveDataDirectory(new URL("../dist/index.mjs", import.meta.url).href), directory);
    }
  } finally { process.chdir(cwd); }
});

test("Mandarin title signal remains separate from listed skills, score and compatibility", () => {
  const job = get("J43");
  assert.equal(job.title, "Mandarin Speaking Junior Data Analyst");
  const baseline = matchRoles([job], [], profile).results[0];
  const row = matchRoles([job], ["Mandarin"], profile).results[0];
  assert.equal(row.titleSignals.length, 1);
  for (const key of ["matchedCount", "requiredCount", "skillCoverage", "overallScore", "compatibilityTier"]) assert.equal(row[key], baseline[key]);
  assert.equal(row.roleSdg.status, "review_required");
});

test("exact, configured equivalents, source alternatives, related and custom skills remain distinct", () => {
  const all = matchRoles(jobs, ["Programming", "Database management", "AI tools", "MS Excel", "JavaScript", "My honest custom skill"], profile);
  assert.equal(all.inputSkillCount, 3, "broad technical areas are excluded from the request skill set");
  assert.equal(skillMatchType("SQL", "Programming"), null);
  assert.equal(skillMatchType("MS Excel", "Microsoft Excel"), "equivalent");
  assert.equal(skillMatchType("JavaScript", "JavaScript"), "exact");
  assert.equal(skillMatchType("Java/Python/C#/JavaScript/TypeScript (at least one)", "Python"), "source-alternative");
  assert.equal(skillMatchType("Python", "Pythn"), null);
  for (const row of all.results) {
    assert.ok(row.unmatchedProfileSkills.includes("My honest custom skill"));
    for (const related of row.relatedSkills) {
      assert.ok(row.skillGaps.some((gap) => gap.skill === related.requirement));
      assert.ok(!row.matchedSkills.some((match) => match.skill === related.requirement));
    }
    assert.equal(row.matchedCount, row.matchedSkills.length);
  }
});

test("low total or technical coverage cannot receive strongest alignment label on any actual record", () => {
  for (const skills of [
    ["Programming", "AI tools", "Database management", "Engineering-related skills"],
    ["Communication", "Teamwork", "Problem-solving", "Adaptability", "Leadership"],
    ["SQL", "Python", "Power BI", "Microsoft Excel", "Git", "JavaScript"],
  ]) {
    for (const row of matchRoles(jobs, skills, { relevantExperienceYears: 10, educationLevel: "Doctorate" }).results) {
      if (row.compatibilityTier === 1) {
        assert.ok(row.skillCoverage >= 50);
        assert.ok(row.technicalCoverage === null || row.technicalCoverage >= 50);
      }
      assert.equal(row.requiredTechnicalCount, row.matchedTechnicalCount + row.skillGaps.filter((skill) => skill.scoreCategory === "technical").length);
    }
  }
  const full = matchRoles([get("J43")], [...get("J43").technicalSkills, ...get("J43").softSkills], profile).results[0];
  assert.equal(full.compatibilityTier, 1);
  assert.equal(full.skillCoverage, 100);
});

test("actual source experience states remain distinct, and missing education stays unavailable", () => {
  const result = matchRoles(jobs, ["SQL"], profile).results;
  const row = (id) => result.find((item) => item.job.id === id);
  assert.equal(row("J2").experienceFit.basis, "unavailable");
  assert.equal(row("J2").experienceFit.suitabilityScore, null);
  assert.equal(row("J43").experienceFit.requirementType, "explicit_none");
  assert.equal(row("J46").experienceFit.requirementType, "preferred");
  assert.notEqual(row("J46").compatibilityTier, 3);
  assert.equal(row("J47").experienceFit.requirementType, "mandatory");
  assert.equal(row("J47").compatibilityTier, 3);
  assert.equal(row("J1").job.title, "Junior Software Developer");
  // The supplied collection has education values for every row. Exercise the
  // missing-field boundary on a COPY of an actual record, not an invented job.
  assert.ok(jobs.every((job) => job.education.trim()));
  const missing = matchRoles([{ ...get("J43"), education: "" }], ["SQL"], profile).results[0];
  assert.equal(missing.educationFit.suitabilityScore, null);
  assert.equal(missing.educationFit.status, "not_stated");
  assert.notEqual(missing.compatibilityTier, 3);
});
