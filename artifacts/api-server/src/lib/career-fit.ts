import type {
  CareerLevel,
  CompatibilityTier,
  JobListing,
  MatchDimensionStatus,
  MatchWeights,
  RoleEducationFit,
  RoleExperienceFit,
  ScoreBreakdownItem,
  ScoreCategory,
} from "@workspace/api-zod";
import { canonicalSkill } from "./skill-gap.ts";

export const MATCH_WEIGHTS: MatchWeights = {
  industrySpecificSkills: 40,
  technicalSkills: 30,
  digitalSkills: 12.5,
  softSkills: 12.5,
  experience: 5,
  evidence: 0,
  broadTechnicalAreas: 0,
};

export const ALIGNMENT_SKILL_THRESHOLDS = { total: 50, technical: 50 } as const;

export const OVERALL_MATCH_FORMULA =
  "Weighted average of applicable industry-specific skills (40%), technical skills (30%), digital skills (12.5%), soft skills (12.5%), and explicitly relevant experience (5%). Unavailable or inapplicable categories are excluded and remaining base weights are normalised for each role. Education, evidence, and broad technical areas do not contribute.";

const digitalSkillKeys = new Set([
  "excel",
  "microsoft excel",
  "microsoft office",
  "microsoft word",
  "google sheets",
  "gantt charts",
]);

const broadAreaKeys = new Set([
  "programming",
  "web development",
  "database management",
  "data analysis",
  "ai tools",
  "cloud computing",
  "cybersecurity",
  "engineering-related skills",
  "other technical skills",
]);

export function isBroadTechnicalArea(value: string): boolean {
  return broadAreaKeys.has(canonicalSkill(value));
}

export type RequirementSourceCategory = "technical" | "soft";
export type SkillScoreCategory = "industry-specific" | "technical" | "digital" | "soft";
export type ScoredSkillCategory = Exclude<ScoreCategory, "experience" | "evidence" | "broad-technical-areas">;

/** One primary category per source requirement; source wording is never changed. */
export function scoreCategoryForRequirement(
  job: JobListing,
  sourceCategory: RequirementSourceCategory,
  requirement: string,
): SkillScoreCategory {
  if (sourceCategory === "soft") return "soft";
  if (digitalSkillKeys.has(canonicalSkill(requirement))) return "digital";
  if (["mechanical", "digital-marketing", "human-resources", "accounting-finance"].includes(job.sector)) {
    return "industry-specific";
  }
  return "technical";
}

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

function clearMinimumYears(text: string): number | null {
  const normalized = normalizeText(text).toLowerCase();
  const matches = [...normalized.matchAll(/(\d+(?:\.\d+)?)\s*(?:[-–—]\s*(\d+(?:\.\d+)?))?\s*\+?\s*years?\b/gi)];
  if (matches.length !== 1 || matches[0][2] !== undefined) return null;
  const match = matches[0];
  const years = Number(match[1]);
  if (!Number.isFinite(years) || years < 0) return null;
  const before = normalized.slice(0, match.index);
  const after = normalized.slice((match.index ?? 0) + match[0].length);
  if (/\b(prefer(?:red|ably)|ideally)\b/.test(before)
    || /\b(?:preferred|preferably|an advantage|advantageous)\b/.test(after)) return null;
  const explicitMinimum = /\b(?:minimum|at least|no less than|required|must have|mandatory)\b/.test(before)
    || /^\s*(?:of\s+)?(?:relevant\s+)?(?:work\s+)?experience\s+(?:is\s+)?required\b/.test(after);
  return explicitMinimum ? years : null;
}

function experienceType(
  sourceText: string,
): RoleExperienceFit["requirementType"] {
  const normalized = normalizeText(sourceText).toLowerCase();
  if (!normalized || /\bnot specified|not stated|not provided|not explicitly specified\b/.test(normalized)) return "unavailable";
  if (/\b(?:prior|previous|work|relevant)?\s*experience\s+(?:is\s+)?not required\b/.test(normalized)
    || /\bno\s+(?:prior|previous|work|relevant)?\s*experience\s+(?:is\s+)?required\b/.test(normalized)) return "explicit_none";
  if (/\bprefer(?:red|ably)\b|\ban advantage\b|\badvantageous\b/.test(normalized)) return "preferred";
  if (/\balternatively\b|\bas an alternative\b|\bmay be considered\b|\bcurrently pursuing\b/.test(normalized)) return "conditional";
  if (/\b(?:less than|up to|at most|maximum of|no more than|under)\b/.test(normalized)) return "conditional";
  if (/\d+(?:\.\d+)?\s*[-–—]\s*\d+(?:\.\d+)?\s*\+?\s*years?\b/i.test(normalized)) return "source_range";
  if (clearMinimumYears(normalized) !== null) return "mandatory";
  if (/\bexperience\b|\bproven\b|\bexpertise\b|\binternship\b/i.test(normalized)) return "qualitative";
  return "unavailable";
}

export function assessExperienceFit(
  title: string,
  sourceText: string,
  relevantYearsValue?: number,
): RoleExperienceFit {
  const level = classifyCareerLevel(title);
  const userYears = typeof relevantYearsValue === "number" && Number.isFinite(relevantYearsValue) && relevantYearsValue >= 0
    ? relevantYearsValue
    : null;
  const requirementType = experienceType(sourceText);
  const sourceMinimumYears = requirementType === "mandatory" ? clearMinimumYears(sourceText) : null;
  const shared = {
    roleLevel: level,
    requirementType,
    sourceText,
    basis: requirementType === "unavailable" ? "unavailable" as const : "source" as const,
    sourceMinimumYears,
    guidelineYears: null,
    userYears,
  };

  if (requirementType === "explicit_none") {
    return {
      ...shared,
      suitabilityScore: 100,
      status: "not_required",
      summary: "The source explicitly says prior experience is not required.",
      reason: "No relevant-experience minimum is applied; the original source wording remains available.",
    };
  }

  if (requirementType === "mandatory" && sourceMinimumYears !== null) {
    if (userYears === null) {
      return {
        ...shared,
        suitabilityScore: null,
        status: "not_provided",
        summary: `The source states a minimum of ${sourceMinimumYears} years.`,
        reason: "Relevant work experience was not provided. Total work experience is not substituted.",
      };
    }
    const suitabilityScore = sourceMinimumYears === 0
      ? 100
      : Math.round(Math.min(userYears / sourceMinimumYears, 1) * 1000) / 10;
    const status: MatchDimensionStatus = userYears >= sourceMinimumYears ? "meets" : "gap";
    return {
      ...shared,
      suitabilityScore,
      status,
      summary: `Source-stated minimum: ${sourceMinimumYears} years; profile reports ${userYears} relevant years.`,
      reason: status === "gap"
        ? `Your stated ${userYears} relevant years is below the source's ${sourceMinimumYears}-year minimum. This is a simplified comparison, not a hiring prediction.`
        : `Your stated relevant years meet this numeric minimum only; employer eligibility is not verified.`,
    };
  }

  const status: MatchDimensionStatus = requirementType === "unavailable" ? "not_stated" : "uncertain";
  const summary =
    requirementType === "source_range" ? "The source gives an experience range; no single numeric minimum is inferred."
      : requirementType === "preferred" ? "Experience is described as preferred; it is not treated as a mandatory numeric threshold."
        : requirementType === "conditional" ? "The source describes a conditional, alternative, or upper-bound experience path."
          : requirementType === "qualitative" ? "The source uses qualitative experience wording without a clear comparable minimum."
            : "The source does not state a comparable experience requirement.";
  const reason =
    requirementType === "unavailable"
      ? "Not specified in the source. No experience is inferred from the job title or seniority."
      : "This wording is preserved for review and excluded from numerical scoring because it cannot be compared consistently.";
  return {
    ...shared,
    suitabilityScore: null,
    status,
    summary,
    reason,
  };
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

function hasConditionalEducationPath(experienceText: string): boolean {
  const text = normalizeText(experienceText).toLowerCase();
  return /\bcurrently pursuing\b|\bmay be considered\b|\balternatively\b|\bas an alternative\b/.test(text);
}

export function assessEducationFit(
  sourceText: string,
  userEducationValue?: string,
  experienceText = "",
): RoleEducationFit {
  const userEducation = userEducationValue?.trim() || null;
  const userLevel = educationLevelRank(userEducation);
  const source = normalizeText(sourceText);
  const conditional = hasConditionalEducationPath(experienceText);
  const minimumLevel = educationRequirementLevel(source);
  const base = {
    sourceText,
    userLevel,
    userEducation,
    suitabilityScore: null,
  };

  if (conditional) {
    return {
      ...base,
      requirementType: "conditional",
      basis: "conditional",
      minimumLevel: null,
      status: "uncertain",
      summary: "The listing describes an alternative or conditional path.",
      reason: "The listed level cannot establish whether the alternative path applies. Review the original wording.",
    };
  }
  if (!source || /\bnot specified|not stated|not provided\b/i.test(source)) {
    return {
      ...base,
      requirementType: "not_stated",
      basis: "unavailable",
      minimumLevel: null,
      status: "not_stated",
      summary: "No education threshold is specified.",
      reason: "Missing source information is not treated as a pass or failure.",
    };
  }
  if (minimumLevel === null) {
    return {
      ...base,
      requirementType: "unrecognized",
      basis: "unavailable",
      minimumLevel: null,
      status: "unavailable",
      summary: "The source education wording cannot be compared safely.",
      reason: "The original text is retained; no qualification level is inferred.",
    };
  }
  if (!userEducation) {
    return {
      ...base,
      requirementType: "mandatory",
      basis: "source",
      minimumLevel,
      status: "not_provided",
      summary: "Education level not provided.",
      reason: "A level comparison is unavailable until the profile provides an education level.",
    };
  }
  if (userLevel === null) {
    return {
      ...base,
      requirementType: "mandatory",
      basis: "source",
      minimumLevel,
      status: "unavailable",
      summary: "The profile education value cannot be placed on the supported level scale.",
      reason: "No pass or failure is inferred from an unrecognised value.",
    };
  }
  const status: MatchDimensionStatus = userLevel >= minimumLevel ? "meets" : "gap";
  const levelNames = ["", "Secondary school", "Certificate", "Diploma", "Bachelor's degree", "Master's degree", "Doctorate"];
  return {
    ...base,
    requirementType: "mandatory",
    basis: "source",
    minimumLevel,
    status,
    summary: `Lowest recognised listed level: ${levelNames[minimumLevel]}; profile selection: ${userEducation}.`,
    reason: status === "gap"
      ? "The selected level is below the recognised stated threshold. This is a level comparison only, not a full eligibility determination."
      : "The selected level meets the recognised threshold only; field of study, equivalency, and other employer conditions are not verified.",
  };
}

type SkillCounts = Record<ScoredSkillCategory, { matchedCount: number; requiredCount: number }>;
const scoredCategories: Array<[ScoredSkillCategory, keyof MatchWeights]> = [
  ["industry-specific", "industrySpecificSkills"],
  ["technical", "technicalSkills"],
  ["digital", "digitalSkills"],
  ["soft", "softSkills"],
];

const round1 = (value: number) => Math.round(value * 10) / 10;
const round2 = (value: number) => Math.round(value * 100) / 100;

export function buildScoreBreakdown(
  skillCounts: SkillCounts,
  experience: RoleExperienceFit,
): { scoreBreakdown: ScoreBreakdownItem[]; overallScore: number | null } {
  const pending: ScoreBreakdownItem[] = scoredCategories.map(([category, weightKey]) => {
    const { matchedCount, requiredCount } = skillCounts[category];
    const baseWeight = MATCH_WEIGHTS[weightKey];
    if (requiredCount === 0) {
      return {
        category, matchedCount: 0, requiredCount: 0, coverage: null,
        baseWeight, effectiveWeight: null, contribution: null,
        status: "not-applicable", explanation: "The source lists no distinct requirements in this category.",
      };
    }
    const coverage = round1((matchedCount / requiredCount) * 100);
    return {
      category, matchedCount, requiredCount, coverage, baseWeight,
      effectiveWeight: null, contribution: null, status: "scored",
      explanation: `${matchedCount} of ${requiredCount} distinct source-listed requirements were matched by name.`,
    };
  });

  const experienceBaseWeight = MATCH_WEIGHTS.experience;
  if (experience.suitabilityScore === null) {
    const status = experience.status === "not_provided" ? "unknown"
      : experience.status === "not_stated" ? "not-specified"
        : "not-scorable";
    pending.push({
      category: "experience",
      matchedCount: 0,
      requiredCount: 0,
      coverage: null,
      baseWeight: experienceBaseWeight,
      effectiveWeight: null,
      contribution: null,
      status,
      explanation: experience.reason,
    });
  } else {
    pending.push({
      category: "experience",
      matchedCount: 0,
      requiredCount: 0,
      coverage: experience.suitabilityScore,
      baseWeight: experienceBaseWeight,
      effectiveWeight: null,
      contribution: null,
      status: "scored",
      explanation: experience.reason,
    });
  }
  pending.push({
    category: "evidence", matchedCount: 0, requiredCount: 0, coverage: null,
    baseWeight: MATCH_WEIGHTS.evidence, effectiveWeight: 0, contribution: 0,
    status: "excluded", explanation: "Optional self-reported evidence is context only and is not scored.",
  });
  pending.push({
    category: "broad-technical-areas", matchedCount: 0, requiredCount: 0, coverage: null,
    baseWeight: MATCH_WEIGHTS.broadTechnicalAreas, effectiveWeight: 0, contribution: 0,
    status: "excluded", explanation: "Broad areas help organise exploration; they do not establish specific skills.",
  });

  const active = pending.filter((item) => item.status === "scored");
  const baseTotal = active.reduce((sum, item) => sum + item.baseWeight, 0);
  if (baseTotal === 0) return { scoreBreakdown: pending, overallScore: null };

  let contributionTotal = 0;
  const scoreBreakdown = pending.map((item) => {
    if (item.status !== "scored") return item;
    const effectiveWeight = item.baseWeight / baseTotal * 100;
    const contribution = (item.coverage ?? 0) * effectiveWeight / 100;
    contributionTotal += contribution;
    return {
      ...item,
      effectiveWeight: round2(effectiveWeight),
      contribution: round2(contribution),
    };
  });
  return { scoreBreakdown, overallScore: round1(contributionTotal) };
}

export function overallMatchScore(scoreBreakdown: ScoreBreakdownItem[]): number | null {
  const active = scoreBreakdown.filter((item) => item.status === "scored" && item.contribution !== null);
  if (!active.length) return null;
  return round1(active.reduce((sum, item) => sum + item.contribution!, 0));
}

export function compatibilityFor(
  experience: RoleExperienceFit,
  education: RoleEducationFit,
  skillCoverage: number | null,
  technicalCoverage: number | null,
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
  const nonMandatoryGap = [experience, education].some((fit) => fit.status === "gap");
  const insufficientSkills = skillCoverage === null
    || skillCoverage < ALIGNMENT_SKILL_THRESHOLDS.total
    || (technicalCoverage !== null && technicalCoverage < ALIGNMENT_SKILL_THRESHOLDS.technical);
  if (insufficientSkills) {
    reasons.push(skillCoverage === null
      ? "The source lists no comparable skills, so stronger alignment cannot be established."
      : "Stronger alignment guidance requires at least 50% total skill coverage and 50% technical coverage where applicable. These are product heuristics, not employer criteria.");
  }
  if (unresolved.length || nonMandatoryGap || insufficientSkills) {
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
    reasons: ["At least 50% of total and applicable technical requirements match, with no identified mandatory experience or education gap. This is not a complete eligibility decision."],
  };
}

export function applicableBaseWeightTotal(weights: MatchWeights = MATCH_WEIGHTS): number {
  return weights.industrySpecificSkills + weights.technicalSkills + weights.digitalSkills + weights.softSkills + weights.experience;
}

export function isEducationThresholdStatus(status: RoleEducationFit["status"]): "meets" | "below" | "unclear" {
  if (status === "meets") return "meets";
  if (status === "gap") return "below";
  return "unclear";
}

export type MatchScoreCategory = ScoreCategory;

export function scoreCategoryWeight(category: ScoredSkillCategory): number {
  return MATCH_WEIGHTS[
    category === "industry-specific" ? "industrySpecificSkills"
      : category === "technical" ? "technicalSkills"
        : category === "digital" ? "digitalSkills" : "softSkills"
  ];
}

export function supportedJobForScoring(job: JobListing): JobListing {
  return job;
}
