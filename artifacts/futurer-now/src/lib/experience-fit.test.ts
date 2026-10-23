import assert from "node:assert/strict";
import test from "node:test";
import { assessExperience } from "./experience-fit.ts";

test("zero stated years is valid and warns separately below an explicit numerical requirement", () => {
  const result = assessExperience(0, "Minimum 5 years of software development experience");
  assert.equal(result.status, "below_requirement");
  assert.equal(result.minimumYears, 5);
  assert.match(result.message, /skill score is unchanged/i);
});

test("ranges and plus notation compare only the numeric lower threshold", () => {
  assert.equal(assessExperience(1, "2–4 years; graphic design and content production").status, "below_requirement");
  assert.equal(assessExperience(2, "2–4 years; graphic design and content production").status, "meets_numeric_minimum");
  assert.equal(assessExperience(2, "3+ years in software development").minimumYears, 3);
  assert.match(assessExperience(8, "Minimum 5 years of relevant experience").message, /does not verify relevant-domain/i);
});

test("preferred, fresh-graduate exceptions, upper bounds and alternative qualification paths are not eligibility failures", () => {
  for (const text of [
    "Preferably 2 years", "Minimum 2–3 years of relevant experience preferred",
    "1 year relevant software development experience; fresh graduates with relevant project experience may be considered",
    "Minimum 3 years with a degree; alternatively, more than 5 years with a diploma",
    "Less than 2 years of relevant working experience", "At most 2 years",
    "Not explicitly specified", "Proven software development experience",
    "2 years in engineering or 1 year in design", "",
  ]) assert.equal(assessExperience(0, text).status, "not_comparable", text);
});

test("missing or invalid stated years never causes a false mismatch", () => {
  for (const years of ["", undefined, null, NaN, -1] as const) {
    assert.equal(assessExperience(years, "Minimum 5 years").status, "not_provided");
  }
  assert.equal(assessExperience(0, null).status, "not_comparable");
});
