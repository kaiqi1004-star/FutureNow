import type { JobListing, RelatedRoleSkill, RoleTitleSignal } from "@workspace/api-zod";
import { canonicalSkill } from "./skill-gap.ts";

// Deliberate, directional relationships, NOT synonyms. Never used in scores.
const relatedRequirements: Record<string, string[]> = {
  programming: ["python", "javascript", "c#", "debugging", "software testing", "software development", "object-oriented programming"],
  "web development": ["html", "css", "javascript", "react", "php", "laravel", "next.js", "rest api"],
  "database management": ["sql", "mysql", "postgresql", "sql server", "database design", "databases", "azure sql"],
  "data analysis": ["python", "sql", "excel", "power bi", "tableau", "data pipelines", "statistics", "data visualization"],
  "ai tools": ["ai algorithms", "generative ai", "ai-powered content creation", "ai marketing tools"],
  "cloud computing": ["microsoft azure", "cloud deployment", "aws/azure/google cloud", "kubernetes", "docker"],
  cybersecurity: ["application security", "system/network/server maintenance"],
  "engineering-related skills": ["solidworks", "mechanical design", "cad drawings", "robotics", "automation systems", "technical drawings"],
  communication: ["technical communication", "client communication", "english communication", "communication in mandarin and english"],
  mandarin: ["communication in mandarin and english"],
};

export function relatedRoleSkills(job: JobListing, input: string[], missing: string[]): RelatedRoleSkill[] {
  const requirements = new Set(missing);
  const result: RelatedRoleSkill[] = [];
  for (const profileSkill of [...new Set(input)]) {
    const related = relatedRequirements[canonicalSkill(profileSkill)] ?? [];
    for (const requirement of [...job.technicalSkills, ...job.softSkills]) {
      if (requirements.has(requirement) && related.includes(canonicalSkill(requirement))) {
        result.push({ profileSkill, requirement, explanation: "Related context only. This does not establish the listed requirement and adds nothing to coverage or suitability." });
      }
    }
  }
  return result;
}

export function roleTitleSignals(job: JobListing, input: string[]): RoleTitleSignal[] {
  const mandarin = input.find((skill) => canonicalSkill(skill) === "mandarin");
  return mandarin && /mandarin[\s-]+speaking/i.test(job.title)
    ? [{ profileSkill: mandarin, sourceText: job.title, explanation: "The title mentions Mandarin speaking. This separate title signal does not change listed-skill coverage, suitability scores, or compatibility tiers." }]
    : [];
}
