import assert from "node:assert/strict";
import test from "node:test";
import {
  assessEducationFit,
  assessExperienceFit,
  classifyCareerLevel,
  MATCH_WEIGHTS,
  overallMatchScore,
} from "../src/lib/career-fit.ts";

test("career levels and fallback guidelines are conservative and configurable", () => {
  assert.equal(classifyCareerLevel("Data Analyst Intern"), "internship");
  assert.equal(classifyCareerLevel("Mandarin Speaking Junior Data Analyst"), "entry");
  assert.equal(classifyCareerLevel("Senior Data Analyst"), "senior");
  assert.equal(classifyCareerLevel("Team Manager"), "manager");
  assert.equal(classifyCareerLevel("Data Analyst"), "unspecified");

  const inferred = assessExperienceFit("Senior Data Analyst Engineer", "Not specified", 0);
  assert.equal(inferred.requirementType, "inferred");
  assert.equal(inferred.basis, "title_guideline");
  assert.equal(inferred.guidelineYears, 2);
  assert.equal(inferred.status, "gap");
  assert.match(inferred.summary, /not explicitly stated by the employer/i);
});

test("explicit minimums, preferred ranges, non-minimum wording, and alternative paths stay distinct", () => {
  const originalWording = "  Minimum 3 years  ";
  const mandatory = assessExperienceFit("Senior Data Analyst", originalWording, 0);
  assert.equal(mandatory.requirementType, "mandatory");
  assert.equal(mandatory.sourceMinimumYears, 3);
  assert.equal(mandatory.sourceText, originalWording);
  assert.equal(mandatory.suitabilityScore, 0);
  assert.equal(mandatory.status, "gap");

  const preferred = assessExperienceFit("Senior Data Analyst", "4–5 years preferred", 0);
  assert.equal(preferred.requirementType, "preferred");
  assert.equal(preferred.status, "gap");

  const sourceRange = assessExperienceFit("Accountant", "3–5 years in accounting", 0);
  assert.equal(sourceRange.requirementType, "source_range");
  assert.equal(sourceRange.status, "gap");

  const alternative = assessExperienceFit(
    "Senior Mechanical Engineer",
    "Minimum 3 years with a degree; alternatively, more than 5 years with a diploma",
    0,
  );
  assert.equal(alternative.requirementType, "conditional");
  assert.equal(alternative.suitabilityScore, null);
  assert.equal(alternative.status, "uncertain");

  const upperBound = assessExperienceFit("Junior Mechanical Engineer", "Less than 2 years", 0);
  assert.equal(upperBound.requirementType, "conditional");
  assert.equal(upperBound.sourceMinimumYears, null);
});

test("fresh-graduate and internship wording is not treated as an experience shortfall", () => {
  const graduateSignal = assessExperienceFit(
    "Data Analyst",
    "Fresh graduates encouraged to apply",
    0,
  );
  assert.equal(graduateSignal.roleLevel, "entry");
  assert.equal(graduateSignal.requirementType, "inferred");
  assert.equal(graduateSignal.sourceMinimumYears, null);
  assert.equal(graduateSignal.guidelineYears, 0);
  assert.notEqual(graduateSignal.status, "not_required");
  assert.match(graduateSignal.summary, /not explicitly stated by the employer/i);

  const graduate = assessExperienceFit(
    "Junior Data Analyst",
    "Fresh graduates encouraged to apply; prior experience not required in the listing.",
    0,
  );
  assert.equal(graduate.requirementType, "explicit_none");
  assert.equal(graduate.status, "not_required");
  assert.equal(graduate.suitabilityScore, 100);

  const intern = assessExperienceFit("Data Analyst Intern", "Internship", 0);
  assert.equal(intern.roleLevel, "internship");
  assert.equal(intern.requirementType, "inferred");
  assert.equal(intern.guidelineYears, 0);
  assert.equal(intern.status, "meets");
  assert.match(intern.summary, /not explicitly stated by the employer/i);

  const implicitNone = assessExperienceFit(
    "Junior Mechanical Engineer",
    "No specific years stated; practical experience is not explicitly required",
    0,
  );
  assert.equal(implicitNone.requirementType, "explicit_none");
  assert.equal(implicitNone.status, "not_required");
});

test("missing experience is unavailable, not a perfect score or a confirmed failure", () => {
  const explicit = assessExperienceFit("Senior Data Analyst", "Minimum 3 years");
  assert.equal(explicit.userYears, null);
  assert.equal(explicit.suitabilityScore, null);
  assert.equal(explicit.status, "not_provided");

  const inferred = assessExperienceFit("Senior Data Analyst", "Not specified");
  assert.equal(inferred.guidelineYears, 2);
  assert.equal(inferred.suitabilityScore, null);
  assert.equal(inferred.status, "not_provided");
});

test("education uses only recognizable profile and source levels", () => {
  const bachelor = assessEducationFit("Bachelor's or Equivalent", "Bachelor’s degree");
  assert.equal(bachelor.minimumLevel, 4);
  assert.equal(bachelor.userLevel, 4);
  assert.equal(bachelor.suitabilityScore, 100);
  assert.equal(bachelor.status, "meets");

  const diploma = assessEducationFit(
    "Diploma / Advanced Diploma / Higher Graduate Diploma / DVM / DKM Level 4 / DLKM Level 5",
    "Bachelor’s degree",
  );
  assert.equal(diploma.minimumLevel, 3);
  assert.equal(diploma.status, "meets");

  const below = assessEducationFit("Bachelor's or Equivalent", "Diploma");
  assert.equal(below.suitabilityScore, 75);
  assert.equal(below.status, "gap");

  const missing = assessEducationFit("Bachelor's or Equivalent");
  assert.equal(missing.suitabilityScore, null);
  assert.equal(missing.status, "not_provided");

  const unrecognized = assessEducationFit("Bachelor's or Equivalent", "Other");
  assert.equal(unrecognized.suitabilityScore, null);
  assert.equal(unrecognized.status, "unavailable");

  const conditional = assessEducationFit(
    "Bachelor's or Equivalent",
    "Diploma",
    "Minimum 3 years with a degree; alternatively, more than 5 years with a diploma",
  );
  assert.equal(conditional.requirementType, "conditional");
  assert.equal(conditional.suitabilityScore, null);
  assert.equal(conditional.status, "uncertain");
});

test("overall score applies configured weights and renormalizes only available dimensions", () => {
  assert.deepEqual(MATCH_WEIGHTS, {
    skillCoverage: 60,
    experienceSuitability: 25,
    educationSuitability: 15,
  });
  assert.equal(overallMatchScore(80, 50, 100), 75.5);
  assert.equal(overallMatchScore(80, null, null), 80);
  assert.equal(overallMatchScore(null, 40, 100), 62.5);
  assert.equal(overallMatchScore(null, null, null), null);
});
