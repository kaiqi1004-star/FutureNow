import type { JobListing, RoleMatchResults } from "@workspace/api-zod";
import { calculateSkillGap } from "./skill-gap.ts";
import { mapRoleToSdgs, mapSkillToSdgs, SDG_NOTICE } from "./sdg-mapping.ts";

export const MATCH_FORMULA =
  "Matched distinct source-listed requirements ÷ all distinct source-listed requirements × 100, rounded to 1 decimal place. Each technical or soft-skill requirement has equal weight.";

export function matchRoles(jobs: readonly JobListing[], currentSkills: string[]): RoleMatchResults {
  const inputSkills = [...new Set(currentSkills.map((skill) => skill.trim()).filter(Boolean))];
  const results = jobs.map((job) => {
    const analysis = calculateSkillGap(job, inputSkills);
    return {
      job,
      matchedCount: analysis.matchedCount,
      requiredCount: analysis.requiredCount,
      score: analysis.coveragePercent,
      matchedSkills: analysis.matchedSkills.map((skill) => ({ ...skill, sdg: mapSkillToSdgs(skill.skill, job) })),
      skillGaps: analysis.missingSkills.map((skill) => ({ ...skill, sdg: mapSkillToSdgs(skill.skill, job) })),
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
    // Compare the unrounded ratios; one-decimal display rounding cannot change rank.
    const aScore = a.requiredCount ? a.matchedCount / a.requiredCount : -1;
    const bScore = b.requiredCount ? b.matchedCount / b.requiredCount : -1;
    return bScore - aScore || a.job.id.localeCompare(b.job.id, "en", { numeric: true });
  });
  return {
    totalJobs: jobs.length,
    inputSkillCount: new Set(inputSkills.map((skill) => skill.toLowerCase())).size,
    formula: MATCH_FORMULA,
    scoringNotes: [
      "This is estimated profile-to-job skill fit, not a probability of hiring, future job security, or national demand.",
      "Matching reuses the existing conservative skill comparison: case/spacing normalization, documented aliases, and explicit source-listed alternatives. Broad labels do not imply specific tools.",
      "Only explicitly selected or custom saved skill names are scored. Interests, education, experience, readiness and self-rated proficiency are context only; free-text evidence is not mined for inferred skills.",
      "A gap means not found in this profile, not that you definitely lack the skill. Profile statements are self-reported, not independently demonstrated.",
      "Ranks use the unrounded coverage ratio; ties use record ID in ascending numeric order. Salary and career category never increase a score.",
      "Records with no listed requirements have an unavailable score and rank last. Zero-coverage records remain available but are not recommendations.",
    ],
    sdgNotice: SDG_NOTICE,
    results,
  };
}
