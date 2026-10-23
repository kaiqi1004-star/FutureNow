import type { JobListing } from "@workspace/api-zod";

export type SourceContext = Pick<JobListing, "title" | "industry" | "technicalSkills" | "softSkills">;

// Ordered by specific work activities, not titles or the app's career category.
// Every selected context retains the actual technical requirements supporting it.
export const SDG_CONTEXT_CATALOGUE = [
  {
    id: "finance", name: "accounting and responsible business operations", goal: 8 as const, target: "8.3",
    pattern: /accounting|financial report|bookkeeping|general ledger|account reconciliation|cash.flow|accounts payable|accounts receivable|IFRS|GAAP|MFRS|corporate tax/i,
    conditions: "Only when used for accurate, responsible enterprise finance and productive business activity; ordinary spreadsheet use or a job title alone is insufficient.",
  },
  {
    id: "engineering", name: "engineering and industrial development", goal: 9 as const, target: "9.5",
    pattern: /mechanical|engineering (?:design|draw|solution)|technical drawings|CAD|solidworks|robotic|automation|prototyp|manufacturing|machinery troubleshooting/i,
    conditions: "Only when supporting engineering research, validated design, or industrial technological development; no social or environmental outcome is assumed.",
  },
  {
    id: "software", name: "software and digital systems development", goal: 9 as const, target: "9.5",
    pattern: /software|programming|web develop|Laravel|PHP|React|Angular|JavaScript|TypeScript|C#|C\+\+|\.NET|Next\.js|Node\.js|HTML5?|CSS3?|Flutter|application security|code quality/i,
    conditions: "Only when used to develop reliable technology, research tools, or industrial innovation; routine tool use does not itself establish SDG achievement.",
  },
  {
    id: "data", name: "data analysis and technological research", goal: 9 as const, target: "9.5",
    pattern: /data (?:analys|analytic|clean|visual|model|pipeline)|SQL|Python|Power BI|Tableau|Pandas|NumPy|MongoDB|statistics|statistical|ETL|machine learning|AI algorithm/i,
    conditions: "Only when analysis informs research, technological innovation, or industrial development, with valid methods and responsible data use. The listing does not prove that application.",
  },
  {
    id: "marketing", name: "responsible enterprise outreach and market access", goal: 8 as const, target: "8.3",
    pattern: /marketing|campaign|SEO|SEM|lead generation|conversion tracking/i,
    conditions: "Only when truthful, responsible outreach supports productive businesses or entrepreneurship; no sales growth, fair practice, or employment outcome is assumed.",
  },
  {
    id: "employment", name: "fair recruitment and employment administration", goal: 8 as const, target: "8.5",
    pattern: /recruitment|payroll|CV screening|salary administration|employee relations|interviewing/i,
    conditions: "Only when used to support fair employment access, accurate pay, and equal treatment. A recruitment or payroll skill alone does not prove decent work.",
  },
];

export function resolveWorkContext(job?: SourceContext) {
  if (!job) return null;
  for (const entry of SDG_CONTEXT_CATALOGUE) {
    const evidence = job.technicalSkills.filter((skill) => entry.pattern.test(skill));
    if (evidence.length) return { ...entry, evidence: evidence.slice(0, 3) };
  }
  return null;
}
