import type { JobListing, RoleMatchResults, ScoreBreakdownItem } from "@workspace/api-zod";
import { calculateSkillGap, canonicalSkill, skillMatchType } from "./skill-gap.ts";
import { relatedRoleSkills, roleTitleSignals } from "./role-skill-context.ts";
import { mapRoleToSdgs, mapSkillToSdgs, SDG_NOTICE } from "./sdg-mapping.ts";
import {
  assessEducationFit,
  assessExperienceFit,
  buildScoreBreakdown,
  compatibilityFor,
  isBroadTechnicalArea,
  MATCH_WEIGHTS,
  OVERALL_MATCH_FORMULA,
  scoreCategoryForRequirement,
  type ScoredSkillCategory,
} from "./career-fit.ts";

export const MATCH_FORMULA =
  "Matched distinct source-listed requirements ÷ all distinct source-listed requirements × 100, rounded to 1 decimal place. Each requirement is assigned to one primary category; related skills do not count.";

export interface MatchProfileContext {
  relevantExperienceYears?: number;
  educationLevel?: string;
}

const scoreCategories: ScoredSkillCategory[] = ["industry-specific", "technical", "digital", "soft"];
const supportedProfileFields = new Set(["currentSkills", "relevantExperienceYears", "educationLevel"]);
const emptyCounts = () => Object.fromEntries(
  scoreCategories.map((category) => [category, { matchedCount: 0, requiredCount: 0 }]),
) as Record<ScoredSkillCategory, { matchedCount: number; requiredCount: number }>;

export function hasUnexpectedMatchInputFields(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.keys(value).some((key) => !supportedProfileFields.has(key));
}

export function matchRoles(
  jobs: readonly JobListing[],
  currentSkills: string[],
  profile: MatchProfileContext = {},
): RoleMatchResults {
  const uniqueSkillMap = new Map<string, string>();
  for (const value of currentSkills) {
    const skill = value.trim();
    const key = canonicalSkill(skill);
    if (skill && !isBroadTechnicalArea(skill) && !uniqueSkillMap.has(key)) uniqueSkillMap.set(key, skill);
  }
  const inputSkills = [...uniqueSkillMap.values()];

  const results = jobs.map((job) => {
    const analysis = calculateSkillGap(job, inputSkills);
    const toRoleSkill = (skill: typeof analysis.matchedSkills[number], matchedBy: string | null) => ({
      ...skill,
      scoreCategory: scoreCategoryForRequirement(job, skill.category, skill.skill),
      matchedBy,
      matchType: matchedBy ? skillMatchType(skill.skill, matchedBy) : null,
      sdg: mapSkillToSdgs(skill.skill, job),
    });
    const matchedSkills = analysis.matchedSkills.map((skill) => toRoleSkill(skill, skill.matchedBy));
    const skillGaps = analysis.missingSkills.map((skill) => toRoleSkill(skill, null));
    const skillCounts = emptyCounts();
    for (const skill of [...matchedSkills, ...skillGaps]) {
      skillCounts[skill.scoreCategory].requiredCount++;
      if (skill.matchedBy) skillCounts[skill.scoreCategory].matchedCount++;
    }

    const matchedTechnicalCount = skillCounts.technical.matchedCount;
    const requiredTechnicalCount = skillCounts.technical.requiredCount;
    const technicalCoverage = requiredTechnicalCount
      ? Math.round((matchedTechnicalCount / requiredTechnicalCount) * 1000) / 10
      : null;
    const experienceFit = assessExperienceFit(job.title, job.experience, profile.relevantExperienceYears);
    const educationFit = assessEducationFit(job.education, profile.educationLevel, job.experience);
    const { scoreBreakdown, overallScore } = buildScoreBreakdown(skillCounts, experienceFit);
    const compatibility = compatibilityFor(experienceFit, educationFit, analysis.coveragePercent, technicalCoverage);
    const reconciledScoreBreakdown: ScoreBreakdownItem[] = scoreBreakdown;

    return {
      job,
      matchedCount: analysis.matchedCount,
      requiredCount: analysis.requiredCount,
      skillCoverage: analysis.coveragePercent,
      technicalCoverage,
      matchedTechnicalCount,
      requiredTechnicalCount,
      relatedSkills: relatedRoleSkills(job, inputSkills, analysis.missingSkills.map((skill) => skill.skill)),
      titleSignals: roleTitleSignals(job, inputSkills),
      score: analysis.coveragePercent,
      overallScore,
      scoreBreakdown: reconciledScoreBreakdown,
      compatibilityTier: compatibility.tier,
      compatibilityLabel: compatibility.label,
      compatibilityReasons: compatibility.reasons,
      experienceFit,
      educationFit,
      matchedSkills,
      skillGaps,
      unmatchedProfileSkills: analysis.unmatchedInputSkills,
      roleSdg: mapRoleToSdgs(job),
      improvement: analysis.requiredCount === 0
        ? "The source lists no skills to compare. Review the original listing and ask the employer for requirements."
        : analysis.missingSkills.length
          ? "Review the skills not found in your saved profile. Add only skills you genuinely have; a missing profile entry does not prove you lack the skill. Check the original education and experience wording."
          : "All listed skills were found in your self-reported profile. Review the original education and experience wording; this does not establish eligibility.",
    };
  });

  results.sort((a, b) => {
    const aOverall = a.overallScore ?? -1;
    const bOverall = b.overallScore ?? -1;
    const aCoverage = a.skillCoverage ?? -1;
    const bCoverage = b.skillCoverage ?? -1;
    return a.compatibilityTier - b.compatibilityTier
      || bOverall - aOverall
      || bCoverage - aCoverage
      || a.job.id.localeCompare(b.job.id, "en", { numeric: true });
  });

  return {
    totalJobs: jobs.length,
    inputSkillCount: inputSkills.length,
    formula: MATCH_FORMULA,
    overallFormula: OVERALL_MATCH_FORMULA,
    weights: MATCH_WEIGHTS,
    scoringNotes: [
      "These estimates compare self-reported skill names with supplied requirements; they are not hiring probabilities or validated employment predictions.",
      "The five positive base weights are Industry-Specific Skills 40%, Technical Skills 30%, Digital Skills 12.5%, Soft Skills 12.5%, and Experience 5%. Evidence and Broad Technical Areas each contribute 0%.",
      "Each distinct source-listed requirement is assigned once to a primary category. Exact and explicitly configured equivalent/source alternatives can match; related skills remain separate and earn no coverage.",
      "Applicable categories are renormalised per role. Categories without usable requirements or experience data are excluded rather than treated as a pass or failure.",
      "Experience is scored only from explicitly reported relevant years and a clear source-stated minimum, or an explicit statement that prior experience is not required. Total years and title seniority are not substituted.",
      "Education is shown as a separate level-threshold comparison and is not part of the numeric suitability estimate. Meeting a level does not establish full eligibility.",
      "The stronger-alignment tier uses 50% total and 50% technical skill coverage where applicable, plus no known mandatory experience or education gap. These are product heuristics, not employer criteria.",
      "Evidence stays in the user's browser and is displayed only beside a skill explicitly linked to a saved entry. It is not sent to the matcher or scored.",
    ],
    sdgNotice: SDG_NOTICE,
    results,
  };
}
