import type { JobListing } from "@workspace/api-client-react";

export type ScenarioSourceId = "world-bank-2026" | "ilo-2025" | "wef-2025";
export type ScenarioEvidenceType = "planning-assumption" | "source-finding" | "preparation-suggestion";

export type ScenarioResearchSource = {
  id: ScenarioSourceId;
  title: string;
  publisher: string;
  publishedOn: string;
  scope: "Malaysia" | "Global";
  originalUrl: string;
  finding: string;
  methodology: string;
  verifiedOn: string;
};

export const scenarioResearchSources: ScenarioResearchSource[] = [
  {
    id: "world-bank-2026",
    title: "Malaysia Economic Monitor: Raising the Ceiling, Raising the Floor — The Jobs Agenda as a Productivity Agenda",
    publisher: "World Bank Group",
    publishedOn: "April 2026",
    scope: "Malaysia",
    originalUrl: "https://documents1.worldbank.org/curated/en/099051226192580550/pdf/P512647-e2a972de-71e8-4f26-98c0-eb11db9d07c6.pdf",
    finding: "Box 7 reports that a World Bank–ISIS Malaysia task-based study estimated about 45% of Malaysian workers were in jobs with high (28%) or medium-high (17%) generative-AI task exposure. The report stresses that exposure is not displacement and says outcomes depend on task mix, adoption pace, complementary skills, workplace context, and wider economic effects.",
    methodology: "The report describes the cited 2025 study as a task-based analysis of how much occupational work could be performed by AI. The estimate concerns worker exposure, not job losses, a selected job record, or a forecast of occupational demand.",
    verifiedOn: "2026-10-24",
  },
  {
    id: "ilo-2025",
    title: "Generative AI and jobs: A 2025 update",
    publisher: "International Labour Organization",
    publishedOn: "20 May 2025",
    scope: "Global",
    originalUrl: "https://www.ilo.org/publications/generative-ai-and-jobs-2025-update",
    finding: "The ILO says one in four workers worldwide are in an occupation with some generative-AI exposure, but most jobs are more likely to be transformed than made redundant because human input continues to be needed. This is global evidence, not a Malaysian or job-record-specific estimate.",
    methodology: "The update combines task-level data with human and AI input, assesses nearly 30,000 tasks at the six-digit occupational level, and defines four exposure gradients using mean exposure and task variability.",
    verifiedOn: "2026-10-24",
  },
  {
    id: "wef-2025",
    title: "The Future of Jobs Report 2025",
    publisher: "World Economic Forum",
    publishedOn: "7 January 2025",
    scope: "Global",
    originalUrl: "https://www.weforum.org/publications/the-future-of-jobs-report-2025/",
    finding: "In the survey, 85% of employers said they planned to prioritize workforce upskilling and 63% identified skills gaps as a major barrier to business transformation over 2025–2030. These are employer expectations, not observed outcomes or Malaysia-only findings.",
    methodology: "The report presents the perspectives of more than 1,000 employers across 22 industry clusters and 55 economies, collectively representing more than 14 million workers.",
    verifiedOn: "2026-10-24",
  },
];

export type ScenarioStatement = {
  text: string;
  evidenceType: ScenarioEvidenceType;
  sourceIds: ScenarioSourceId[];
};

export type AdoptionScenario = {
  id: "moderate" | "fast";
  title: string;
  paceLabel: string;
  summary: string;
  assumptions: ScenarioStatement[];
  taskChanges: {
    automation: ScenarioStatement;
    assistance: ScenarioStatement;
    humanInvolvement: ScenarioStatement;
  };
  opportunities: ScenarioStatement[];
  challenges: ScenarioStatement[];
  skillImplications: ScenarioStatement[];
  preparationActions: ScenarioStatement[];
};

export const adoptionScenarios: AdoptionScenario[] = [
  {
    id: "moderate",
    title: "Moderate AI adoption",
    paceLabel: "Gradual and selective",
    summary: "Planning case: organizations introduce AI step by step, testing it in selected workflows while workers and processes adapt incrementally.",
    assumptions: [
      {
        text: "Adoption is gradual and uneven across organizations; this is a scenario assumption, not a measured rate.",
        evidenceType: "planning-assumption",
        sourceIds: ["world-bank-2026"],
      },
      {
        text: "Early use focuses on suitable task steps such as drafting, summarizing, coding assistance, or content generation described by the World Bank report.",
        evidenceType: "source-finding",
        sourceIds: ["world-bank-2026"],
      },
    ],
    taskChanges: {
      automation: {
        text: "Scenario assumption: some bounded, repeatable information tasks could be partly automated where the tools and work context fit. No role is marked as replaceable.",
        evidenceType: "planning-assumption",
        sourceIds: ["world-bank-2026"],
      },
      assistance: {
        text: "AI could assist with selected drafts, summaries, code help, or content work; these are task possibilities, not confirmed duties in the supplied listings.",
        evidenceType: "source-finding",
        sourceIds: ["world-bank-2026"],
      },
      humanInvolvement: {
        text: "People may continue to provide context, check outputs, handle exceptions, and make accountable decisions. The ILO’s global analysis emphasizes transformation rather than assuming whole-job redundancy.",
        evidenceType: "source-finding",
        sourceIds: ["ilo-2025"],
      },
    },
    opportunities: [
      {
        text: "With job redesign and skills upgrading, selective adoption may help workers shift effort toward higher-value tasks. This is a potential benefit described by the World Bank, not a guaranteed outcome.",
        evidenceType: "source-finding",
        sourceIds: ["world-bank-2026"],
      },
    ],
    challenges: [
      {
        text: "Uneven access to technology, training, and adjustment support could leave some workers or firms behind; the World Bank identifies diffusion and worker adaptation as important conditions.",
        evidenceType: "source-finding",
        sourceIds: ["world-bank-2026"],
      },
    ],
    skillImplications: [
      {
        text: "The World Bank report recommends stronger foundational, digital, and socio-emotional skills, with upskilling linked to industry needs.",
        evidenceType: "source-finding",
        sourceIds: ["world-bank-2026"],
      },
      {
        text: "The exact technical and soft skills listed in the selected job record remain the record’s requirements; they are not a forecast of future demand.",
        evidenceType: "preparation-suggestion",
        sourceIds: [],
      },
    ],
    preparationActions: [
      {
        text: "Choose one bounded AI-assisted workflow to practise, then verify its factual, technical, and contextual accuracy before relying on the output.",
        evidenceType: "preparation-suggestion",
        sourceIds: ["world-bank-2026", "ilo-2025"],
      },
      {
        text: "Strengthen a skill explicitly listed in the selected record and use a small project to show how you applied it.",
        evidenceType: "preparation-suggestion",
        sourceIds: ["wef-2025"],
      },
    ],
  },
  {
    id: "fast",
    title: "Fast AI adoption",
    paceLabel: "Faster and broader",
    summary: "Planning case: AI capabilities and workplace adoption advance more quickly, so more suitable workflows are redesigned sooner and adaptation needs become more immediate.",
    assumptions: [
      {
        text: "Organizations adopt AI across a broader set of suitable workflows at a faster pace; this is a hypothetical assumption, not a forecast.",
        evidenceType: "planning-assumption",
        sourceIds: ["world-bank-2026"],
      },
      {
        text: "Whether AI substitutes for or complements workers still depends on tasks, complementary skills, workplace practices, and broader economic conditions.",
        evidenceType: "source-finding",
        sourceIds: ["world-bank-2026"],
      },
    ],
    taskChanges: {
      automation: {
        text: "Scenario assumption: a wider set of suitable repeatable task steps could be reconsidered for automation sooner. This does not estimate job losses or say that a whole occupation disappears.",
        evidenceType: "planning-assumption",
        sourceIds: ["world-bank-2026"],
      },
      assistance: {
        text: "Scenario assumption: more workflows could use AI for first drafts, summaries, coding help, or content generation, with workers adapting how those steps are reviewed and completed.",
        evidenceType: "planning-assumption",
        sourceIds: ["world-bank-2026"],
      },
      humanInvolvement: {
        text: "Output checking, domain context, exception handling, and responsibility remain planning considerations. The ILO’s global findings do not establish what will happen in this specific Malaysian role.",
        evidenceType: "source-finding",
        sourceIds: ["ilo-2025"],
      },
    },
    opportunities: [
      {
        text: "Faster diffusion may support productivity gains when paired with job redesign and skills upgrading. The World Bank describes this as potential, not a guaranteed result.",
        evidenceType: "source-finding",
        sourceIds: ["world-bank-2026"],
      },
    ],
    challenges: [
      {
        text: "If redesign and worker adaptation do not keep pace, the World Bank warns that AI diffusion could deepen labour-market polarization and reduce demand for some routine cognitive work. This is a reported risk, not a forecast for the selected job.",
        evidenceType: "source-finding",
        sourceIds: ["world-bank-2026"],
      },
    ],
    skillImplications: [
      {
        text: "Faster change could make ongoing upskilling and the ability to check AI-assisted work more urgent; the pace and outcome are scenario assumptions, not measured probabilities.",
        evidenceType: "planning-assumption",
        sourceIds: ["world-bank-2026", "wef-2025"],
      },
      {
        text: "The World Economic Forum’s upskilling findings describe surveyed employer plans, not guaranteed Malaysian hiring or skill outcomes.",
        evidenceType: "source-finding",
        sourceIds: ["wef-2025"],
      },
    ],
    preparationActions: [
      {
        text: "Practise verifying AI-assisted work before use, including the source, calculations, edge cases, and role-specific context.",
        evidenceType: "preparation-suggestion",
        sourceIds: ["ilo-2025", "world-bank-2026"],
      },
      {
        text: "Prioritize one or two requirements from the selected record and, where available, use an existing Feature 3 learning resource.",
        evidenceType: "preparation-suggestion",
        sourceIds: ["wef-2025"],
      },
    ],
  },
];

export type TaskIllustration = {
  automation: string;
  assistance: string;
  humanInvolvement: string;
};

export const taskIllustrationsBySector: Record<JobListing["sector"], TaskIllustration> = {
  software: {
    automation: "Create a first draft of repetitive code comments or test scaffolding.",
    assistance: "Explain or suggest changes to code using technologies named in the selected record.",
    humanInvolvement: "Run tests, investigate failures, and decide whether a change is safe and suitable.",
  },
  mechanical: {
    automation: "Organize repeated measurements or routine maintenance notes.",
    assistance: "Prepare a first-pass summary of inspection notes or design alternatives.",
    humanInvolvement: "Check physical conditions, interpret safety context, and review technical decisions.",
  },
  "data-analytics": {
    automation: "Prepare a first-pass summary or routine transformation of structured data.",
    assistance: "Draft a query, chart, or explanation for an analyst to review.",
    humanInvolvement: "Validate data quality, assumptions, and what a result can support.",
  },
  "accounting-finance": {
    automation: "Sort a routine set of structured records for review.",
    assistance: "Draft an explanation of a variance or a summary of a document set.",
    humanInvolvement: "Review exceptions, controls, compliance context, and decisions.",
  },
  "digital-marketing": {
    automation: "Generate first-draft variations of routine campaign copy.",
    assistance: "Summarize audience or campaign information and suggest copy for review.",
    humanInvolvement: "Check claims, brand context, audience fit, and platform requirements.",
  },
  "human-resources": {
    automation: "Prepare a first draft of routine people-related documentation from approved inputs.",
    assistance: "Summarize policy or survey information for a human reviewer.",
    humanInvolvement: "Handle confidential context, fairness, exceptions, and accountable people decisions.",
  },
};

export const taskIllustrationDisclosure =
  "Illustrative planning examples only. The supplied 50 job records list skills and experience requirements, not verified daily duties; these examples do not mean a task or job will be automated.";

export const scenarioCategoryLabels: Record<JobListing["sector"], string> = {
  software: "Software",
  mechanical: "Mechanical",
  "data-analytics": "Data Analytics",
  "accounting-finance": "Accounting / Finance",
  "digital-marketing": "Digital Marketing",
  "human-resources": "HR",
};

export function getScenarioSource(id: ScenarioSourceId): ScenarioResearchSource | undefined {
  return scenarioResearchSources.find((source) => source.id === id);
}

export function getScenarioForId(id: AdoptionScenario["id"]): AdoptionScenario {
  return adoptionScenarios.find((scenario) => scenario.id === id) ?? adoptionScenarios[0]!;
}
