import type { SdgAssessment, SdgConnection } from "@workspace/api-zod";

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
};

const rules: MappingRule[] = [
  {
    id: "inclusive-workplace", pattern: /gender equality|equal opportunit|anti.discriminat|inclusive (hiring|recruitment)/i,
    goal: 5, target: "5.1",
    explanation: "When applied to fair workplace practices, this activity may help reduce gender discrimination. The listing alone does not establish that an employer achieves equality.",
  },
  {
    id: "skills-development", pattern: /mentor|(?:user|staff|employee) training|training and development|teaching|coaching|knowledge sharing|user education/i,
    goal: 4, target: "4.4",
    explanation: "Sharing practical knowledge or delivering training may help people develop skills for employment. Contribution depends on accessible, effective learning in practice.",
  },
  {
    id: "decent-work-practices", pattern: /payroll|labou?r law|employee relations|workplace safety|occupational safety|labou?r rights/i,
    goal: 8, target: "8.8",
    explanation: "Applied lawfully and fairly, this workplace activity may support worker protections and safe employment. A skill listing is not proof of an employer's labour practices.",
  },
  {
    id: "fair-employment-access", pattern: /recruitment|talent acquisition|inclusive hiring/i,
    goal: 8, target: "8.5",
    explanation: "Fair, accessible recruitment may help people access productive employment and equal work opportunities. This depends on actual hiring practices, not the presence of the skill label.",
  },
  {
    id: "enterprise-operations", pattern: /accounting|financial (report|analys|process)|bookkeeping|cash.flow|budget|cost (account|control)|\btax\b|\baudit(?:ing)?\b|marketing|campaign|\bseo\b|\bsem\b|lead generation|social media/i,
    goal: 8, target: "8.3",
    explanation: "Responsible enterprise finance or market-access work may support productive business activity and entrepreneurship. This is conditional on ethical implementation, not a growth prediction.",
  },
  {
    id: "technical-innovation", pattern: /\b(?:python|java|javascript|typescript|php|sql|html|css|react|angular|vue|laravel|git|sas|power bi|tableau|statistics|statistical)\b|c#|c\+\+|\.net|software|programming|web (app|develop)|database|data (analys|visual|integrat|model)|machine learning|engineering|mechanical|solidworks|cad\b|3d modell|automation|robotic|hydraulic|prototyp|cloud|\bapi\b|algorithm|debugg|unit test|integration test|test.driven|machinery/i,
    goal: 9, target: "9.5",
    explanation: "Used in research, reliable systems, or sustainable industrial innovation, this technical capability may strengthen technological capacity. The tool or role itself does not guarantee sustainable outcomes.",
  },
  {
    id: "asset-life-and-waste", pattern: /preventive maintenance|mechanical maintenance|machinery maintenance|repair|recycl|waste|material (selection|efficien)|inventory management|spare.parts management/i,
    goal: 12, target: "12.5",
    explanation: "When used to extend asset life, reduce avoidable material use, or prevent waste, this practice may support responsible production. Actual waste reduction must be demonstrated separately.",
  },
  {
    id: "sustainability-reporting", pattern: /sustainability report|environmental report|resource efficiency/i,
    goal: 12, target: "12.6",
    explanation: "Reliable sustainability reporting or resource monitoring may help organisations adopt and report sustainable practices. No such result is assumed from a listed skill alone.",
  },
];

export const SDG_NOTICE =
  "Indicative, manually curated connections—not official UN job classifications. A role or skill may contribute depending on its application; a tag does not establish SDG achievement. Uncertain mappings are flagged for review.";

export function mapSkillToSdgs(skill: string): SdgAssessment {
  const connections: SdgConnection[] = rules
    .filter((rule) => rule.pattern.test(skill))
    .map((rule) => ({
      goalNumber: rule.goal,
      title: SDG_GOALS[rule.goal],
      target: rule.target,
      url: `https://sdgs.un.org/goals/goal${rule.goal}#targets_and_indicators`,
      explanation: rule.explanation,
      evidence: skill,
      ruleId: rule.id,
    }));
  return {
    connections,
    reviewRequired: connections.length === 0,
    reviewReason: connections.length ? null :
      "No sufficiently specific connection is established by this skill wording. Review its actual application rather than assigning an unrelated goal.",
  };
}

export function mapRoleToSdgs(skills: readonly string[]): SdgAssessment {
  const byGoal = new Map<number, SdgConnection>();
  for (const skill of skills) {
    for (const connection of mapSkillToSdgs(skill).connections) {
      if (!byGoal.has(connection.goalNumber)) byGoal.set(connection.goalNumber, {
        ...connection,
        explanation: `Potential role connection grounded in the source-listed skill “${skill}”. ${connection.explanation}`,
      });
    }
  }
  return {
    connections: [...byGoal.values()].sort((a, b) => a.goalNumber - b.goalNumber),
    reviewRequired: byGoal.size === 0,
    reviewReason: byGoal.size ? null :
      "The listed requirements do not establish a defensible SDG connection. Review the work's actual purpose and application.",
  };
}
