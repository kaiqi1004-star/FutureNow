import type {
  CareerLevel,
  CompatibilityTier,
  EducationRequirementBasis,
  EducationRequirementType,
  ExperienceRequirementBasis,
  ExperienceRequirementType,
  MatchDimensionStatus,
  MatchWeights,
  RoleEducationFit,
  RoleExperienceFit,
} from "@workspace/api-zod";

export const MATCH_WEIGHTS: MatchWeights = {
  skillCoverage: 60,
  experienceSuitability: 25,
  educationSuitability: 15,
};

/** Internal comparison guidelines only; these are not employer requirements. */
export const ROLE_EXPERIENCE_GUIDELINES: Partial<Record<CareerLevel, number>> = {
  internship: 0,
  entry: 0,
  mid: 2,
  senior: 2,
  lead: 3,
  manager: 4,
};

export const OVERALL_MATCH_FORMULA =
  "Weighted average of available skill coverage (60%), experience suitability (25%), and education suitability (15%). Unavailable dimensions are excluded and the remaining weights are proportionally renormalized; result is rounded to 1 decimal place.";

const normalizeText = (value: string) =>
  value.normalize("NFKC").replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();

export function classifyCareerLevel(title: string): CareerLevel {
  const normalized = normalizeText(title).toLowerCase();
  if (/\b(intern|internship)\b/.test(normalized)) return "internship";
  if (/\b(manager|head|director|chief|vice president|vp)\b/.test(normalized)) return "manager";
  if (/\b(lead|principal)\b/.test(normalized)) return "lead";
  if (/\b(mid[-\s]?level|intermediate)\b/.test(normalized)) return "mid";
  if (/\b(senior|sr\.?)\b/.test(normalized)) return "senior";
  if (/\b(graduate|entry[-\s]?level|junior)\b/.test(normalized)) return "entry";
  return "unspecified";
}

function parseMinimumYears(text: string): number | null {
  const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(?:[-–—]\s*(\d+(?:\.\d+)?))?\s*\+?\s*years?\b/gi)];
  if (matches.length !== 1) return null;
  const lower = Number(matches[0][1]);
  return Number.isFinite(lower) && lower >= 0 ? lower : null;
}

function preferredNumericRequirement(text: string): boolean {
  return /\bprefer(?:red|ably)\s+\d+(?:\.\d+)?\s*(?:[-–—]\s*\d+(?:\.\d+)?)?\s*\+?\s*years?\b/i.test(text)
    || /\b\d+(?:\.\d+)?\s*(?:[-–—]\s*\d+(?:\.\d+)?)?\s*\+?\s*years?\s+(?:of\s+[^.;,]{1,35}\s+)?(?:experience\s+)?preferred\b/i.test(text)
    || /\bexperience\s+preferred\b/i.test(text);
}

function experienceIsExplicitlyNotRequired(text: string): boolean {
  return /\b(no|not required|not explicitly required)\s+(?:prior\s+|previous\s+)?experience\b/i.test(text)
    || /\bprior experience\s+(?:is\s+)?not required\b/i.test(text)
    || /\bexperience\s+(?:is\s+)?not explicitly required\b/i.test(text)
    || /\bexperience\s+is\s+not required\b/i.test(text);
}

function experienceHasAlternativePath(text: string): boolean {
  return /\balternatively\b|\bas an alternative\b|\bmay be considered\b|\bdepending on qualifications\b|\bor\s+(?:(?:at least|more than|minimum)\s+)?\d+(?:\.\d+)?\s*years?\b/i.test(text);
}

function inferredExperience(
  level: CareerLevel,
  sourceText: string,
  userYears: number | null,
): RoleExperienceFit {
  const guideline = ROLE_EXPERIENCE_GUIDELINES[level];
  if (guideline === undefined) {
    return {
      roleLevel: level,
      requirementType: "unavailable",
      sourceText,
      basis: "unavailable",
      sourceMinimumYears: null,
      guidelineYears: null,
      userYears,
      suitabilityScore: null,
      status: "unavailable",
      summary: "No source requirement or supported title-based guideline is available.",
      reason: "The supplied title does not establish a career level, and the listing gives no comparable experience requirement.",
    };
  }

  if (userYears === null) {
    return {
      roleLevel: level,
      requirementType: "inferred",
      sourceText,
      basis: "title_guideline",
      sourceMinimumYears: null,
      guidelineYears: guideline,
      userYears: null,
      suitabilityScore: null,
      status: "not_provided",
      summary: `Estimated experience guideline: ${guideline}+ years, inferred from role seniority; not explicitly stated by the employer.`,
      reason: "Add your stated years of experience to compare this internal guideline. It is not an employer requirement.",
    };
  }

  const suitabilityScore = guideline === 0
    ? 100
    : Math.round(Math.min(100, (userYears / guideline) * 100) * 10) / 10;
  const status: MatchDimensionStatus = userYears >= guideline ? "meets" : "gap";
  return {
    roleLevel: level,
    requirementType: "inferred",
    sourceText,
    basis: "title_guideline",
    sourceMinimumYears: null,
    guidelineYears: guideline,
    userYears,
    suitabilityScore,
    status,
    summary: `Estimated experience guideline: ${guideline}+ years, inferred from role seniority; not explicitly stated by the employer.`,
    reason: status === "gap"
      ? `Your stated ${userYears} years is below the internal ${guideline}-year guideline inferred from the title. This is not a confirmed employer requirement.`
      : `Your stated ${userYears} years meets the internal guideline inferred from the title; this does not establish eligibility.`,
  };
}

export function assessExperienceFit(
  title: string,
  sourceTextValue: string,
  userYearsValue?: number,
): RoleExperienceFit {
  const sourceText = sourceTextValue;
  const titleLevel = classifyCareerLevel(title);
  const freshGraduateSignal = /\bfresh graduates?\s+(?:(?:are|is)\s+)?encouraged to apply\b/i.test(sourceText);
  const level = titleLevel === "unspecified" && freshGraduateSignal ? "entry" : titleLevel;
  const userYears = typeof userYearsValue === "number" && Number.isFinite(userYearsValue) && userYearsValue >= 0
    ? userYearsValue
    : null;
  const normalized = normalizeText(sourceText).toLowerCase();

  if (experienceIsExplicitlyNotRequired(normalized)) {
    return {
      roleLevel: level,
      requirementType: "explicit_none",
      sourceText,
      basis: "source",
      sourceMinimumYears: null,
      guidelineYears: null,
      userYears,
      suitabilityScore: 100,
      status: "not_required",
      summary: "The source indicates that prior experience is not required.",
      reason: "No experience requirement is identified in the source wording.",
    };
  }

  const numericMinimum = parseMinimumYears(normalized);
  if (experienceHasAlternativePath(normalized)) {
    return {
      roleLevel: level,
      requirementType: "conditional",
      sourceText,
      basis: "source",
      sourceMinimumYears: null,
      guidelineYears: null,
      userYears,
      suitabilityScore: null,
      status: "uncertain",
      summary: "The listing describes conditional or alternative experience paths.",
      reason: "The source has more than one experience pathway; this matcher does not reduce them to one mandatory threshold.",
    };
  }

  if (/\b(?:less than|up to|at most|maximum of|no more than|under)\b/i.test(normalized)) {
    return {
      roleLevel: level,
      requirementType: "conditional",
      sourceText,
      basis: "source",
      sourceMinimumYears: null,
      guidelineYears: null,
      userYears,
      suitabilityScore: null,
      status: "uncertain",
      summary: "The source wording is not a comparable minimum-years requirement.",
      reason: "An upper bound or other non-minimum phrase is not treated as a mandatory minimum.",
    };
  }

  if (numericMinimum !== null) {
    const isPreferred = preferredNumericRequirement(normalized);
    const isMandatory = !isPreferred
      && /\b(minimum|at least|no less than|required|must have|mandatory)\b/i.test(normalized);
    const requirementType: ExperienceRequirementType = isPreferred
      ? "preferred"
      : isMandatory ? "mandatory" : "source_range";
    if (userYears === null) {
      return {
        roleLevel: level,
        requirementType,
        sourceText,
        basis: "source",
        sourceMinimumYears: numericMinimum,
        guidelineYears: null,
        userYears: null,
        suitabilityScore: null,
        status: "not_provided",
        summary: `${isPreferred ? "Preferred" : "Source-stated"} experience threshold: ${numericMinimum}+ years.`,
        reason: "Add your stated years of experience to compare this source wording. Total years do not verify relevant-domain experience.",
      };
    }

    const suitabilityScore = numericMinimum === 0
      ? 100
      : Math.round(Math.min(100, (userYears / numericMinimum) * 100) * 10) / 10;
    const status: MatchDimensionStatus = userYears >= numericMinimum ? "meets" : "gap";
    return {
      roleLevel: level,
      requirementType,
      sourceText,
      basis: "source",
      sourceMinimumYears: numericMinimum,
      guidelineYears: null,
      userYears,
      suitabilityScore,
      status,
      summary: `${isPreferred ? "Preferred" : "Source-stated"} threshold: ${numericMinimum}+ years; this comparison uses total years the user reported.`,
      reason: status === "gap"
        ? `Your stated ${userYears} years is below the source's ${numericMinimum}-year lower threshold. Only a clearly mandatory minimum creates Tier 3.`
        : `Your stated ${userYears} years meets the source's numeric threshold, but does not verify relevant-domain experience or eligibility.`,
    };
  }

  if (/\bpreferred\b|\bpreferably\b|\ban advantage\b|\badvantageous\b/i.test(normalized)) {
    return {
      roleLevel: level,
      requirementType: "preferred",
      sourceText,
      basis: "source",
      sourceMinimumYears: null,
      guidelineYears: null,
      userYears,
      suitabilityScore: null,
      status: "uncertain",
      summary: "The source describes preferred experience but gives no comparable number of years.",
      reason: "A preferred qualitative statement is not converted into a numerical requirement.",
    };
  }

  if (/\bexperience\b|\bproven\b|\bexpertise\b/i.test(normalized)
    && !/not explicitly specified|not specified|no specific years stated/i.test(normalized)) {
    return {
      roleLevel: level,
      requirementType: "qualitative",
      sourceText,
      basis: "source",
      sourceMinimumYears: null,
      guidelineYears: null,
      userYears,
      suitabilityScore: null,
      status: "uncertain",
      summary: "The source uses qualitative experience wording without a numerical minimum.",
      reason: "No number is inferred from ambiguous wording; compare this requirement with the original listing.",
    };
  }

  return inferredExperience(level, sourceText, userYears);
}

export function educationLevelRank(value?: string | null): number | null {
  const text = normalizeText(value ?? "").toLowerCase();
  if (!text || /\b(other|prefer not to say)\b/.test(text)) return null;
  if (/doctor|ph\.?d/.test(text)) return 6;
  if (/master/.test(text)) return 5;
  if (/bachelor|degree/.test(text)) return 4;
  if (/diploma|dvm|dkm level [4-6]|dlkm level [4-6]/.test(text)) return 3;
  if (/certificate/.test(text)) return 2;
  if (/secondary|spm|o level|skm level [1-3]/.test(text)) return 1;
  return null;
}

function educationRequirementLevel(sourceText: string): number | null {
  const text = normalizeText(sourceText).toLowerCase();
  const levels: number[] = [];
  if (/\b(?:spm|o level|secondary school|skm level [1-3])\b/.test(text)) levels.push(1);
  if (/\bcertificate\b/.test(text)) levels.push(2);
  if (/\b(?:diploma|dvm|dkm level [4-6]|dlkm level [4-6])\b/.test(text)) levels.push(3);
  if (/\b(?:bachelor|degree)\b/.test(text)) levels.push(4);
  if (/\bmaster(?:'s)?\b/.test(text)) levels.push(5);
  if (/\b(?:doctorate|ph\.?d)\b/.test(text)) levels.push(6);
  return levels.length ? Math.min(...levels) : null;
}

export function assessEducationFit(
  sourceTextValue: string,
  userEducationValue?: string,
  experienceTextValue = "",
): RoleEducationFit {
  const sourceText = sourceTextValue;
  const userEducation = userEducationValue?.trim() || null;
  const userLevel = educationLevelRank(userEducation);
  const source = normalizeText(sourceText).toLowerCase();
  const experience = normalizeText(experienceTextValue).toLowerCase();
  const conditionalPath = /\bcurrently pursuing\b|\bmay be considered\b/i.test(experience)
    || experienceHasAlternativePath(experience);

  if (conditionalPath) {
    return {
      requirementType: "conditional",
      sourceText,
      basis: "conditional",
      minimumLevel: null,
      userLevel,
      userEducation,
      suitabilityScore: null,
      status: "uncertain",
      summary: "The listing describes a conditional education or alternative experience pathway.",
      reason: "The saved profile does not record enrollment or every alternative pathway, so this dimension is not scored as a pass or failure.",
    };
  }

  if (!source || /not specified|not stated|not provided|not explicitly specified/i.test(source)) {
    return {
      requirementType: "not_stated",
      sourceText,
      basis: "unavailable",
      minimumLevel: null,
      userLevel,
      userEducation,
      suitabilityScore: null,
      status: "not_stated",
      summary: "No comparable education requirement is available in the source record.",
      reason: "Missing source information is not treated as a perfect match or a confirmed gap.",
    };
  }

  const minimumLevel = educationRequirementLevel(source);
  if (minimumLevel === null) {
    return {
      requirementType: "unrecognized",
      sourceText,
      basis: "unavailable",
      minimumLevel: null,
      userLevel,
      userEducation,
      suitabilityScore: null,
      status: "unavailable",
      summary: "The listed education wording cannot be compared safely with the profile choices.",
      reason: "The source text is retained, but no qualification level is inferred from unrecognized wording.",
    };
  }

  if (!userEducation) {
    return {
      requirementType: "mandatory",
      sourceText,
      basis: "source",
      minimumLevel,
      userLevel: null,
      userEducation: null,
      suitabilityScore: null,
      status: "not_provided",
      summary: `Lowest recognized listed education level: ${["", "Secondary school", "Certificate", "Diploma", "Bachelor's degree", "Master's degree", "Doctorate"][minimumLevel]}.`,
      reason: "Add the selected education level to compare the listing. A level match does not verify field-of-study or equivalent-qualification details.",
    };
  }

  if (userLevel === null) {
    return {
      requirementType: "mandatory",
      sourceText,
      basis: "source",
      minimumLevel,
      userLevel: null,
      userEducation,
      suitabilityScore: null,
      status: "unavailable",
      summary: "The profile's selected education value cannot be placed in the supported level scale.",
      reason: "The value is preserved; it is not assumed to be either above or below the source requirement.",
    };
  }

  const suitabilityScore = Math.round(Math.min(100, (userLevel / minimumLevel) * 100) * 10) / 10;
  const status: MatchDimensionStatus = userLevel >= minimumLevel ? "meets" : "gap";
  const requiredName = ["", "Secondary school", "Certificate", "Diploma", "Bachelor's degree", "Master's degree", "Doctorate"][minimumLevel];
  return {
    requirementType: "mandatory",
    sourceText,
    basis: "source",
    minimumLevel,
    userLevel,
    userEducation,
    suitabilityScore,
    status,
    summary: `Lowest recognized listed education level: ${requiredName}; profile selection: ${userEducation}.`,
    reason: status === "gap"
      ? "The selected profile level is below the lowest recognized listed level. This is an estimate; review the original listing for equivalencies and subject requirements."
      : "The selected profile level meets the recognized minimum level only; field of study, equivalencies, and other employer conditions are not verified.",
  };
}

export function overallMatchScore(
  skillCoverage: number | null,
  experienceSuitability: number | null,
  educationSuitability: number | null,
): number | null {
  const dimensions: Array<[number | null, number]> = [
    [skillCoverage, MATCH_WEIGHTS.skillCoverage],
    [experienceSuitability, MATCH_WEIGHTS.experienceSuitability],
    [educationSuitability, MATCH_WEIGHTS.educationSuitability],
  ];
  const available = dimensions.filter(
    (dimension): dimension is [number, number] =>
      dimension[0] !== null && Number.isFinite(dimension[0]),
  );
  if (!available.length) return null;
  const weightTotal = available.reduce((sum, [, weight]) => sum + weight, 0);
  const weightedTotal = available.reduce((sum, [score, weight]) => sum + score * weight, 0);
  return Math.round((weightedTotal / weightTotal) * 10) / 10;
}

export function compatibilityFor(
  experience: RoleExperienceFit,
  education: RoleEducationFit,
): { tier: CompatibilityTier; label: string; reasons: string[] } {
  const mandatoryExperienceGap = experience.requirementType === "mandatory" && experience.status === "gap";
  const mandatoryEducationGap = education.requirementType === "mandatory" && education.status === "gap";
  const reasons: string[] = [];
  if (mandatoryExperienceGap) reasons.push(experience.reason);
  if (mandatoryEducationGap) reasons.push(education.reason);
  if (reasons.length) return { tier: 3, label: "Significant requirement gap", reasons };

  const unresolved: Array<RoleExperienceFit | RoleEducationFit> = [experience, education].filter(
    (fit) => ["uncertain", "not_provided", "not_stated", "unavailable"].includes(fit.status),
  );
  const nonMandatoryGap = [experience, education].some(
    (fit) => fit.status === "gap",
  );
  if (unresolved.length || nonMandatoryGap) {
    if (experience.status === "gap" && experience.requirementType !== "mandatory") reasons.push(experience.reason);
    if (education.status === "gap" && education.requirementType !== "mandatory") reasons.push(education.reason);
    if (!reasons.length) {
      const uncertainty = unresolved.find((fit) => fit.reason)?.reason;
      reasons.push(uncertainty ?? "Some role or profile requirements cannot be compared from the available information.");
    }
    return { tier: 2, label: "Potential stretch", reasons };
  }

  return {
    tier: 1,
    label: "Better-aligned opportunity",
    reasons: ["No unmet mandatory experience or education requirement was identified from the available information."],
  };
}
