import type { JobListing, RoleMatchResults } from "@workspace/api-zod";
import { calculateSkillGap, skillMatchType } from "./skill-gap.ts";
import { relatedRoleSkills, roleTitleSignals } from "./role-skill-context.ts";
import { mapRoleToSdgs, mapSkillToSdgs, SDG_NOTICE } from "./sdg-mapping.ts";
import {
  assessEducationFit,
  assessExperienceFit,
  compatibilityFor,
  MATCH_WEIGHTS,
  OVERALL_MATCH_FORMULA,
  overallMatchScore,
  ROLE_EXPERIENCE_GUIDELINES,
} from "./career-fit.ts";

export const MATCH_FORMULA =
  "Matched distinct source-listed requirements ÷ all distinct source-listed requirements × 100, rounded to 1 decimal place. Each technical or soft-skill requirement has equal weight.";

export interface MatchProfileContext {
  experienceYears?: number;
  educationLevel?: string;
}

export function matchRoles(
  jobs: readonly JobListing[],
  currentSkills: string[],
  profile: MatchProfileContext = {},
): RoleMatchResults {
  const inputSkills = [...new Set(currentSkills.map((skill) => skill.trim()).filter(Boolean))];
  const results = jobs.map((job) => {
    const analysis = calculateSkillGap(job, inputSkills);
    const experienceFit = assessExperienceFit(job.title, job.experience, profile.experienceYears);
    const educationFit = assessEducationFit(job.education, profile.educationLevel, job.experience);
    const skillCoverage = analysis.coveragePercent;
    const matchedTechnicalCount = analysis.matchedSkills.filter((skill) => skill.category === "technical").length;
    const requiredTechnicalCount = matchedTechnicalCount + analysis.missingSkills.filter((skill) => skill.category === "technical").length;
    const technicalCoverage = requiredTechnicalCount
      ? Math.round(matchedTechnicalCount / requiredTechnicalCount * 1000) / 10
      : null;
    const compatibility = compatibilityFor(experienceFit, educationFit, skillCoverage, technicalCoverage);
    return {
      job,
      matchedCount: analysis.matchedCount,
      requiredCount: analysis.requiredCount,
      skillCoverage,
      technicalCoverage,
      matchedTechnicalCount,
      requiredTechnicalCount,
      relatedSkills: relatedRoleSkills(job, inputSkills, analysis.missingSkills.map((skill) => skill.skill)),
      titleSignals: roleTitleSignals(job, inputSkills),
      score: skillCoverage,
      overallScore: overallMatchScore(
        skillCoverage,
        experienceFit.suitabilityScore,
        educationFit.suitabilityScore,
      ),
      compatibilityTier: compatibility.tier,
      compatibilityLabel: compatibility.label,
      compatibilityReasons: compatibility.reasons,
      experienceFit,
      educationFit,
      matchedSkills: analysis.matchedSkills.map((skill) => ({ ...skill, matchType: skillMatchType(skill.skill, skill.matchedBy!), sdg: mapSkillToSdgs(skill.skill, job) })),
      skillGaps: analysis.missingSkills.map((skill) => ({ ...skill, matchType: null, sdg: mapSkillToSdgs(skill.skill, job) })),
      unmatchedProfileSkills: analysis.unmatchedInputSkills,
      roleSdg: mapRoleToSdgs(job),
      improvement: analysis.requiredCount === 0
        ? "The source lists no skills to compare. Review the original listing and ask the employer for requirements."
        : analysis.missingSkills.length
          ? "Review the skills not found in your saved profile. Add a skill only if you genuinely have it, with an example of using it, or practise it before updating your profile. Verify experience and education separately against the listing."
          : "All listed skills were found in your self-reported profile. Add honest evidence of using them and review the employer's experience and education requirements; this is not proof of eligibility.",
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
    inputSkillCount: new Set(inputSkills.map((skill) => skill.toLowerCase())).size,
    formula: MATCH_FORMULA,
    overallFormula: OVERALL_MATCH_FORMULA,
    weights: MATCH_WEIGHTS,
    scoringNotes: [
      "Overall scores are estimates of profile-to-role suitability, not probabilities of hiring, future job security, or national demand.",
      "Matching reuses the existing conservative skill comparison: case/spacing normalization, documented aliases, and explicit source-listed alternatives. Broad labels do not imply specific tools.",
      "Skill coverage remains a separate metric: matched distinct source-listed requirements divided by all distinct listed requirements. Only explicitly saved skill names are compared.",
      "Available dimensions use weights of 60% skill coverage, 25% experience suitability and 15% education suitability. If a dimension is unavailable, its weight is excluded and the remaining weights are proportionally renormalized.",
      "Experience comparisons use the user's self-reported total years. They do not verify relevant-domain experience, leadership, portfolios or eligibility. Conditional/alternative paths are left unscored instead of being reduced to one threshold.",
      `When the source gives no comparable experience requirement, internal title guidelines are ${Object.entries(ROLE_EXPERIENCE_GUIDELINES).map(([level, years]) => `${level} ${years}+`).join(", ")} years. These are estimates, not employer requirements.`,
      "Education comparison maps only recognizable source and profile levels. It does not verify field of study, equivalent qualifications or additional conditions.",
      "Tier 1 requires at least 50% total skill coverage and 50% technical coverage when applicable, with compatible experience and education and no unresolved comparisons. These internal guidance thresholds are not validated hiring cutoffs. Tier 2 marks limited skills, stretch requirements or unresolved information; Tier 3 requires a clear shortfall against a mandatory source requirement.",
      "Exact normalized names, explicit equivalent-name aliases and source-stated one-of alternatives count toward skill coverage. Related skills and title signals never change coverage, overall scores or tiers. Self-rated proficiency is not scored.",
      "A gap means not found in this profile, not that you definitely lack the skill. Profile statements are self-reported, not independently demonstrated.",
      "Results sort by compatibility tier, then overall score, skill coverage and numeric record ID. Salary, job category, interests, readiness and self-rated proficiency never increase a score.",
      "Records with no listed skills have unavailable skill coverage. Other available dimensions can still contribute; if every dimension is unavailable, the overall score is not calculated.",
    ],
    sdgNotice: SDG_NOTICE,
    results,
  };
}
