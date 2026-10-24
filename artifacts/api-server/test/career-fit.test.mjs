import assert from "node:assert/strict";
import test from "node:test";
import {
  assessEducationFit,
  assessExperienceFit,
  buildScoreBreakdown,
  classifyCareerLevel,
  compatibilityFor,
  MATCH_WEIGHTS,
  overallMatchScore,
  scoreCategoryForRequirement,
} from "../src/lib/career-fit.ts";

const emptySkillCounts = () => ({
  "industry-specific": { matchedCount: 0, requiredCount: 0 },
  technical: { matchedCount: 0, requiredCount: 0 },
  digital: { matchedCount: 0, requiredCount: 0 },
  soft: { matchedCount: 0, requiredCount: 0 },
});

test("base weights are exact, active dimensions sum to 100, and excluded dimensions are zero", () => {
  assert.deepEqual(MATCH_WEIGHTS, {
    industrySpecificSkills: 40,
    technicalSkills: 30,
    digitalSkills: 12.5,
    softSkills: 12.5,
    experience: 5,
    evidence: 0,
    broadTechnicalAreas: 0,
  });
  assert.equal(
    MATCH_WEIGHTS.industrySpecificSkills + MATCH_WEIGHTS.technicalSkills
      + MATCH_WEIGHTS.digitalSkills + MATCH_WEIGHTS.softSkills + MATCH_WEIGHTS.experience,
    100,
  );
});

test("career seniority is display context only and never supplies an experience minimum", () => {
  assert.equal(classifyCareerLevel("Data Analyst Intern"), "internship");
  assert.equal(classifyCareerLevel("Mandarin Speaking Junior Data Analyst"), "entry");
  assert.equal(classifyCareerLevel("Senior Data Analyst"), "senior");
  assert.equal(classifyCareerLevel("Team Manager"), "manager");
  assert.equal(classifyCareerLevel("Data Analyst"), "unspecified");
  const senior = assessExperienceFit("Senior Data Analyst", "Not specified", 0);
  assert.equal(senior.requirementType, "unavailable");
  assert.equal(senior.basis, "unavailable");
  assert.equal(senior.sourceMinimumYears, null);
  assert.equal(senior.guidelineYears, null);
  assert.equal(senior.suitabilityScore, null);
  assert.equal(senior.status, "not_stated");
  assert.match(senior.reason, /No experience is inferred from the job title/);
});

test("clear minimum compares only relevant years with capped linear scoring", () => {
  const text = "  Minimum 3 years  ";
  const expected = [[0, 0], [1, 33.3], [2, 66.7], [3, 100], [8, 100]];
  for (const [years, score] of expected) {
    const fit = assessExperienceFit("Senior Data Analyst", text, years);
    assert.equal(fit.sourceText, text);
    assert.equal(fit.requirementType, "mandatory");
    assert.equal(fit.sourceMinimumYears, 3);
    assert.equal(fit.userYears, years);
    assert.equal(fit.suitabilityScore, score);
    assert.equal(fit.status, years >= 3 ? "meets" : "gap");
  }
  const notProvided = assessExperienceFit("Senior Data Analyst", "at least 3 years");
  assert.equal(notProvided.suitabilityScore, null);
  assert.equal(notProvided.status, "not_provided");
  const zeroMinimum = assessExperienceFit("Junior Analyst", "Minimum 0 years", 0);
  assert.equal(zeroMinimum.suitabilityScore, 100);
});

test("preferred, ranges, alternatives, qualitative, and implicit-zero wording are not scored", () => {
  const cases = [
    ["4–5 years preferred", "preferred"],
    ["3–5 years in accounting", "source_range"],
    ["Minimum 3 years with a degree; alternatively, more than 5 years with a diploma", "conditional"],
    ["Experience is an advantage", "preferred"],
    ["Practical experience", "qualitative"],
    ["Fresh graduates encouraged to apply", "unavailable"],
    ["No specific years stated; experience is not explicitly required", "qualitative"],
  ];
  for (const [text, type] of cases) {
    const fit = assessExperienceFit("Junior Mechanical Engineer", text, 0);
    assert.equal(fit.requirementType, type, text);
    assert.equal(fit.suitabilityScore, null, text);
  }
});

test("an explicit no-experience requirement receives a consistent full experience score", () => {
  for (const text of ["No experience required", "No prior experience is required", "Prior experience not required"]) {
    const fit = assessExperienceFit("Graduate Analyst", text);
    assert.equal(fit.requirementType, "explicit_none");
    assert.equal(fit.status, "not_required");
    assert.equal(fit.suitabilityScore, 100);
    assert.equal(fit.sourceText, text);
  }
});

test("requirements receive one source-preserving scoring category by source and sector", () => {
  const software = { sector: "software" };
  const mechanical = { sector: "mechanical" };
  assert.equal(scoreCategoryForRequirement(software, "technical", "Python"), "technical");
  assert.equal(scoreCategoryForRequirement(software, "technical", "Microsoft Excel"), "digital");
  assert.equal(scoreCategoryForRequirement(mechanical, "technical", "CAD"), "industry-specific");
  assert.equal(scoreCategoryForRequirement(mechanical, "soft", "Communication"), "soft");
});

test("education stays a separate threshold status and never receives a numeric score", () => {
  const meets = assessEducationFit("Bachelor's or Equivalent", "Bachelor’s degree");
  assert.equal(meets.minimumLevel, 4);
  assert.equal(meets.userLevel, 4);
  assert.equal(meets.suitabilityScore, null);
  assert.equal(meets.status, "meets");
  const below = assessEducationFit("Bachelor's or Equivalent", "Diploma");
  assert.equal(below.suitabilityScore, null);
  assert.equal(below.status, "gap");
  const missing = assessEducationFit("Bachelor's or Equivalent");
  assert.equal(missing.suitabilityScore, null);
  assert.equal(missing.status, "not_provided");
  const unclear = assessEducationFit("Bachelor's or Equivalent", "Other");
  assert.equal(unclear.suitabilityScore, null);
  assert.equal(unclear.status, "unavailable");
  const conditional = assessEducationFit(
    "Bachelor's or Equivalent",
    "Diploma",
    "Minimum 3 years with a degree; alternatively, more than 5 years with a diploma",
  );
  assert.equal(conditional.requirementType, "conditional");
  assert.equal(conditional.status, "uncertain");
  assert.equal(conditional.suitabilityScore, null);
});

test("per-role scoring omits empty categories and reconciles breakdown contributions to the overall score", () => {
  const counts = emptySkillCounts();
  counts.technical = { matchedCount: 1, requiredCount: 2 };
  counts.soft = { matchedCount: 1, requiredCount: 2 };
  const experience = assessExperienceFit("Analyst", "Minimum 3 years", 2);
  const result = buildScoreBreakdown(counts, experience);
  const scored = result.scoreBreakdown.filter((item) => item.status === "scored");
  assert.equal(result.overallScore, 50);
  assert.equal(scored.reduce((sum, item) => sum + item.effectiveWeight, 0), 100);
  assert.equal(scored.reduce((sum, item) => sum + item.contribution, 0), result.overallScore);
  assert.equal(overallMatchScore(result.scoreBreakdown), result.overallScore);
  for (const category of ["industry-specific", "digital"]) {
    assert.equal(result.scoreBreakdown.find((item) => item.category === category).status, "not-applicable");
  }
  assert.equal(result.scoreBreakdown.find((item) => item.category === "evidence").status, "excluded");
  assert.equal(result.scoreBreakdown.find((item) => item.category === "broad-technical-areas").baseWeight, 0);

  const unavailable = buildScoreBreakdown(emptySkillCounts(), assessExperienceFit("Analyst", "Not specified"));
  assert.equal(unavailable.overallScore, null);
});

test("compatibility requires category coverage and never overrides clear mandatory gaps", () => {
  const noRequirement = assessExperienceFit("Analyst", "Not specified");
  const education = assessEducationFit("Not specified");
  const noSkills = compatibilityFor(noRequirement, education, null, null);
  assert.notEqual(noSkills.tier, 1);
  const gap = compatibilityFor(
    assessExperienceFit("Senior Analyst", "Minimum 3 years", 0),
    education,
    100,
    100,
  );
  assert.equal(gap.tier, 3);
});
