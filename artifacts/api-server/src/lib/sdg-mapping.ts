import type { SdgAssessment, SdgConnection } from "@workspace/api-zod";
import { resolveWorkContext, type SourceContext } from "./sdg-context.ts";

// Curated interpretations, not UN job classifications. Official goal pages and
// target identifiers were checked before authoring these rules.
export const SDG_GOALS = {
  4: "Quality Education",
  5: "Gender Equality",
  8: "Decent Work and Economic Growth",
  9: "Industry, Innovation and Infrastructure",
  12: "Responsible Consumption and Production",
} as const;

type GoalNumber = keyof typeof SDG_GOALS;
type MappingRule = {
  id: string; pattern: RegExp; goal: GoalNumber; target: string; explanation: string;
  conditions: string;
};

export const SDG_SKILL_CATALOGUE: MappingRule[] = [
  {
    id: "inclusive-workplace", pattern: /gender equality|equal opportunit|anti.discriminat|inclusive (hiring|recruitment)/i,
    goal: 5, target: "5.1",
    explanation: "When applied to fair workplace practices, this activity may help reduce gender discrimination. The listing alone does not establish that an employer achieves equality.",
    conditions: "The work must actually address discrimination against women or unequal opportunities, not merely use a generic HR label.",
  },
  {
    id: "skills-development", pattern: /mentor|(?:user|staff|employee) training|training and development|teaching|coaching|knowledge sharing|user education/i,
    goal: 4, target: "4.4",
    explanation: "Sharing practical knowledge or delivering training may help people develop skills for employment. Contribution depends on accessible, effective learning in practice.",
    conditions: "Training must develop people's relevant skills, not refer to training a machine-learning model.",
  },
  {
    id: "decent-work-practices", pattern: /payroll|labou?r law|employee relations|workplace safety|occupational safety|labou?r rights/i,
    goal: 8, target: "8.8",
    explanation: "Applied lawfully and fairly, this workplace activity may support worker protections and safe employment. A skill listing is not proof of an employer's labour practices.",
    conditions: "The activity must protect labour rights, safe working conditions, or lawful employee treatment in practice.",
  },
  {
    id: "fair-employment-access", pattern: /recruitment|talent acquisition|inclusive hiring/i,
    goal: 8, target: "8.5",
    explanation: "Fair, accessible recruitment may help people access productive employment and equal work opportunities. This depends on actual hiring practices, not the presence of the skill label.",
    conditions: "Recruitment must provide fair access to productive employment, with equal treatment and no assumed hiring outcome.",
  },
  {
    id: "enterprise-operations", pattern: /accounting|financial (report|analys|process)|bookkeeping|cash.flow|budget|cost (account|control)|\btax\b|\baudit(?:ing)?\b|marketing|campaign|\bseo\b|\bsem\b|lead generation|social media/i,
    goal: 8, target: "8.3",
    explanation: "Responsible enterprise finance or market-access work may support productive business activity and entrepreneurship. This is conditional on ethical implementation, not a growth prediction.",
    conditions: "The activity must support responsible productive enterprise operations or entrepreneurship, not misleading reporting or outreach.",
  },
  {
    id: "technical-innovation", pattern: /\b(?:python|java|javascript|typescript|php|sql|html|css|react|angular|vue|laravel|git|sas|power bi|tableau|statistics|statistical)\b|c#|c\+\+|\.net|software|programming|web (app|develop)|database|data (analys|analytic|visual|integrat|model|clean)|machine learning|engineering|mechanical|technical drawings|solidworks|cad\b|3d modell|automation|robotic|hydraulic|prototyp|cloud|\bapi\b|algorithm|debugg|unit test|integration test|test.driven|machinery/i,
    goal: 9, target: "9.5",
    explanation: "Used in research, reliable systems, or sustainable industrial innovation, this technical capability may strengthen technological capacity. The tool or role itself does not guarantee sustainable outcomes.",
    conditions: "It must be applied to research, technological capability, or industrial innovation; the connection is potential, not proof of impact.",
  },
  {
    id: "asset-life-and-waste", pattern: /preventive maintenance|mechanical maintenance|machinery maintenance|repair|recycl|waste|material (selection|efficien)|inventory management|spare.parts management/i,
    goal: 12, target: "12.5",
    explanation: "When used to extend asset life, reduce avoidable material use, or prevent waste, this practice may support responsible production. Actual waste reduction must be demonstrated separately.",
    conditions: "The practice must actually prevent waste or extend useful material or equipment life, rather than merely involve inventory or repairs.",
  },
  {
    id: "sustainability-reporting", pattern: /sustainability report|environmental report|resource efficiency/i,
    goal: 12, target: "12.6",
    explanation: "Reliable sustainability reporting or resource monitoring may help organisations adopt and report sustainable practices. No such result is assumed from a listed skill alone.",
    conditions: "Reporting must concern substantive sustainability practices; resource-efficiency work must feed into those practices and reporting.",
  },
];

export const SDG_NOTICE =
  "Indicative, manually curated connections—not official UN job classifications or endorsements. Contributions depend on the stated conditions and actual work. Mapped = a defensible conditional connection; review required = assessed but insufficient evidence; not assessed = not yet evaluated by this catalogue.";

// Mapping-only vocabulary aliases. These never change source text or the skill
// matching canonicalizer/formula. Each alias uses an already assessed family.
export const SDG_SKILL_ALIASES: Record<string, string> = {
  mysql: "SQL database",
  postgresql: "SQL database",
  mongodb: "database",
  html5: "HTML",
  css3: "CSS",
  gitlab: "Git",
  github: "Git",
  "next.js": "software framework",
  "node.js": "software framework",
  remix: "software framework",
  restify: "software framework",
  prisma: "database software",
  "flutter (added advantage)": "software development",
  pandas: "data analysis",
  numpy: "data analysis",
  "general ledger (gl)": "accounting",
  "us gaap": "financial reporting",
  "account reconciliation": "accounting",
  "bank reconciliation": "accounting",
  "accounts payable": "accounting",
  "accounts payable/receivable": "accounting",
  ifrs: "financial reporting",
  mfrs: "financial reporting",
  "financial planning and analysis": "financial analysis",
  "cv screening": "recruitment",
  interviewing: "recruitment",
  "salary administration": "payroll",
};

function assessment(connections: SdgConnection[], status: SdgAssessment["status"], note: string): SdgAssessment {
  return { connections, status, assessmentNote: note, reviewRequired: status === "review_required", reviewReason: status === "review_required" ? note : null };
}

const contextualSkills = [
  {
    id: "spreadsheets", pattern: /\b(?:excel|google sheets|spreadsheets?)\b/i,
    contribution: "Spreadsheet organisation, validation, and analysis can make work evidence more reliable",
  },
  {
    id: "communication", pattern: /communication|presentation|stakeholder liaison/i,
    contribution: "Clear communication can help colleagues understand findings, limitations, and decisions",
  },
  {
    id: "teamwork", pattern: /teamwork|team.work|collaboration|cross.functional coordination/i,
    contribution: "Collaboration can support joint review, knowledge exchange, and coordinated implementation",
  },
  {
    id: "problem-solving", pattern: /problem.solving|root.cause analysis|critical thinking/i,
    contribution: "Structured problem-solving can support evidence-based investigation and correction of errors",
  },
  {
    id: "attention-to-detail", pattern: /attention to detail|detail.oriented|accuracy/i,
    contribution: "Careful checking can improve the reliability of records, calculations, and technical work",
  },
];

export function mapSkillToSdgs(skill: string, job?: SourceContext): SdgAssessment {
  const normalized = skill.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
  const catalogueTerm = SDG_SKILL_ALIASES[normalized] ?? normalized;
  const contextual = contextualSkills.find((entry) => entry.pattern.test(normalized));
  if (contextual) {
    if (!job) return assessment([], "not_assessed", "This skill has not been assessed in a specific work context. View a job's source-listed requirements for a contextual assessment.");
    const context = resolveWorkContext(job);
    if (!context) return assessment([], "review_required", "This general skill was assessed, but the source requirements do not establish a sufficiently specific application to a goal. Review the actual tasks and work purpose.");
    return assessment([{
      goalNumber: context.goal, title: SDG_GOALS[context.goal], target: context.target,
      url: `https://sdgs.un.org/goals/goal${context.goal}#targets_and_indicators`,
      explanation: `${contextual.contribution} in ${context.name}. This is a potential enabling contribution, not evidence that the job achieves the goal.`,
      conditions: context.conditions, indicative: true, contextEvidence: context.evidence,
      evidence: skill, ruleId: `${contextual.id}:${context.id}`,
    }], "mapped", `Assessed using the reusable ${contextual.id} mapping in the source-supported ${context.id} context.`);
  }
  const connections: SdgConnection[] = SDG_SKILL_CATALOGUE
    .filter((rule) => rule.pattern.test(catalogueTerm))
    .map((rule) => ({
      goalNumber: rule.goal,
      title: SDG_GOALS[rule.goal],
      target: rule.target,
      url: `https://sdgs.un.org/goals/goal${rule.goal}#targets_and_indicators`,
      explanation: rule.explanation,
      evidence: skill,
      ruleId: rule.id,
      conditions: rule.conditions,
      indicative: true,
      contextEvidence: job ? [skill] : [],
    }));
  if (connections.length) return assessment(connections, "mapped", "Assessed against the curated source-skill catalogue; contribution is conditional.");
  if (/positive attitude|adaptability|willingness|time management|self.motivation|independent working|discipline/i.test(normalized)) {
    return assessment([], "review_required", "This broad personal or work-style trait does not by itself establish a contribution to a specific SDG. Task-level evidence is needed.");
  }
  return assessment([], "not_assessed", "This skill wording has not yet been evaluated in the mapping catalogue. No goal is assigned.");
}

export function mapRoleToSdgs(job: SourceContext): SdgAssessment {
  const byGoal = new Map<number, SdgConnection>();
  const skills = [...job.technicalSkills, ...job.softSkills];
  for (const skill of skills) {
    for (const connection of mapSkillToSdgs(skill, job).connections) {
      if (!byGoal.has(connection.goalNumber)) byGoal.set(connection.goalNumber, {
        ...connection,
        explanation: `For “${job.title}” (source industry: ${job.industry || "not provided"}), this potential connection is grounded in the listed requirement “${skill}”, not the title alone. ${connection.explanation}`,
      });
    }
  }
  return assessment([...byGoal.values()].sort((a, b) => a.goalNumber - b.goalNumber),
    byGoal.size ? "mapped" : "review_required",
    byGoal.size ? "Role assessed from its actual listed requirements and available source context. Only supported goals are shown." :
      `Role reviewed against the listed technical requirements: ${job.technicalSkills.join("; ") || "none provided"}. These do not establish a sufficiently specific goal connection. Clarify the actual tasks, purpose, and any unexpanded tool acronyms; the job title and industry alone are insufficient.`);
}
