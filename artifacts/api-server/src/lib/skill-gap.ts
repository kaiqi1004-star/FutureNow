import type {
  JobListing,
  SkillGapAnalysis,
  SkillGapLearningResource,
  SkillGapSkill,
} from "@workspace/api-zod";

export const normalizeText = (value: string) =>
  value.normalize("NFKC").trim().toLocaleLowerCase("en").replace(/\s+/g, " ");

const aliases: Record<string, string> = {
  "problem solving": "problem-solving",
  "ms excel": "excel",
  "microsoft excel": "excel",
  "ms word": "microsoft word",
  "ms office": "microsoft office",
  organization: "organisation",
  "data visualisation": "data visualization",
  "html 5": "html",
  html5: "html",
  "css 3": "css",
  css3: "css",
  js: "javascript",
  "react js": "react",
  "react.js": "react",
  nodejs: "node.js",
  "node js": "node.js",
  "c sharp": "c#",
  "c-sharp": "c#",
  "microsoft sql server": "sql server",
  "ms sql server": "sql server",
  postgres: "postgresql",
  "transact sql": "t-sql",
  "transact-sql": "t-sql",
  "restful api": "rest api",
  "restful apis": "rest api",
  "rest apis": "rest api",
  "3d modeling": "3d modelling",
  "test driven development": "test-driven development",
  "test-driven development (tdd)": "test-driven development",
  "object oriented programming": "object-oriented programming",
  "object-oriented programming (oop)": "object-oriented programming",
};

export const canonicalSkill = (skill: string) => {
  const normalized = normalizeText(skill);
  return aliases[normalized] ?? normalized;
};

const resource = (
  title: string,
  provider: string,
  url: string,
  resourceType: SkillGapLearningResource["resourceType"],
  costStatus: SkillGapLearningResource["costStatus"] = "not-stated",
  costNote = "The linked page does not state a course price.",
): SkillGapLearningResource => ({
  title,
  provider,
  url,
  resourceType,
  costStatus,
  costNote,
});

const mdn = resource(
  "Learn web development",
  "MDN Web Docs",
  "https://developer.mozilla.org/en-US/docs/Learn_web_development",
  "learning-path",
  "not-stated",
  "This page links to MDN learning modules and separate partner courses; partner-course prices are not stated here.",
);
const sqlServer = resource(
  "SQL Server technical documentation",
  "Microsoft Learn",
  "https://learn.microsoft.com/en-us/sql/sql-server?view=sql-server-ver17",
  "documentation",
);
const csharp = resource(
  "C# language documentation",
  "Microsoft Learn",
  "https://learn.microsoft.com/en-us/dotnet/csharp",
  "documentation",
);

const verifiedResources: Record<string, SkillGapLearningResource> = {
  html: mdn,
  css: mdn,
  javascript: mdn,
  react: resource(
    "Learn React",
    "React",
    "https://react.dev/learn",
    "tutorial",
  ),
  "react native": resource(
    "React Native documentation",
    "React Native",
    "https://reactnative.dev/docs/getting-started",
    "documentation",
  ),
  angular: resource(
    "Angular tutorials",
    "Angular",
    "https://angular.dev/tutorials",
    "tutorial",
  ),
  "node.js": resource(
    "Learn Node.js",
    "Node.js",
    "https://nodejs.org/en/learn",
    "learning-path",
  ),
  express: resource(
    "Installing Express",
    "Express",
    "https://expressjs.com/en/starter/installing.html",
    "tutorial",
  ),
  "c#": csharp,
  "sql server": sqlServer,
  "t-sql": sqlServer,
  postgresql: resource(
    "PostgreSQL tutorial",
    "PostgreSQL",
    "https://www.postgresql.org/docs/current/tutorial.html",
    "tutorial",
  ),
  mysql: resource(
    "MySQL tutorial",
    "Oracle",
    "https://dev.mysql.com/doc/mysql-tutorial-excerpt/8.0/en/",
    "tutorial",
  ),
  php: resource(
    "Getting started with PHP",
    "PHP",
    "https://www.php.net/manual/en/getting-started.php",
    "tutorial",
  ),
  typescript: resource(
    "TypeScript documentation",
    "TypeScript",
    "https://www.typescriptlang.org/docs/",
    "documentation",
  ),
  git: resource(
    "Pro Git book",
    "Git",
    "https://git-scm.com/book/en/v2",
    "documentation",
    "free",
    "The online book is published under a Creative Commons license; print editions may have a separate price.",
  ),
  docker: resource(
    "Get started with Docker",
    "Docker",
    "https://docs.docker.com/get-started/",
    "tutorial",
  ),
  kubernetes: resource(
    "Kubernetes tutorials",
    "Kubernetes",
    "https://kubernetes.io/docs/tutorials/",
    "tutorial",
  ),
  solidworks: resource(
    "SOLIDWORKS Web Help",
    "SOLIDWORKS",
    "https://help.solidworks.com/HelpProducts.aspx",
    "documentation",
    "not-stated",
    "The documentation page does not state software or training prices.",
  ),
};

const oneOfRequirementAlternatives: Record<string, string[]> = {
  [normalizeText("Java/Python/C#/JavaScript/TypeScript (at least one)")]: [
    "java",
    "python",
    "c#",
    "javascript",
    "typescript",
  ],
};

const prerequisitePairs: Array<[string, string]> = [
  ["html", "javascript"],
  ["css", "javascript"],
  ["javascript", "react"],
  ["javascript", "angular"],
  ["c#", "asp.net mvc"],
  ["c#", ".net core"],
  ["c#", "entity framework (ef)"],
  ["sql", "t-sql"],
  ["git", "branching"],
  ["git", "merging"],
  ["cad drawings", "assembly"],
  ["mechanical drawings", "assembly"],
  ["maintenance", "machinery troubleshooting"],
];

function distinctRequirements(job: JobListing): SkillGapSkill[] {
  const seen = new Set<string>();
  const requirements: SkillGapSkill[] = [];

  for (const [category, skills] of [
    ["technical", job.technicalSkills ?? []],
    ["soft", job.softSkills ?? []],
  ] as const) {
    for (const skill of skills) {
      const key = canonicalSkill(skill);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      requirements.push({ skill, category, matchedBy: null });
    }
  }

  return requirements;
}

function requirementMatches(requirement: string, inputSkill: string): boolean {
  const requirementKey = canonicalSkill(requirement);
  const inputKey = canonicalSkill(inputSkill);
  const alternatives =
    oneOfRequirementAlternatives[normalizeText(requirement)];

  return alternatives
    ? alternatives.includes(inputKey)
    : requirementKey === inputKey;
}

export function skillMatchType(requirement: string, input: string): "exact" | "equivalent" | "source-alternative" | null {
  if (!requirementMatches(requirement, input)) return null;
  if (normalizeText(requirement) === normalizeText(input)) return "exact";
  if (oneOfRequirementAlternatives[normalizeText(requirement)]) return "source-alternative";
  return "equivalent";
}

function orderRoadmap(missing: SkillGapSkill[]): SkillGapSkill[] {
  const remaining = [...missing];
  const ordered: SkillGapSkill[] = [];

  while (remaining.length) {
    const remainingKeys = new Set(
      remaining.map(({ skill }) => canonicalSkill(skill)),
    );
    const readyIndex = remaining.findIndex(({ skill }) => {
      const key = canonicalSkill(skill);
      return !prerequisitePairs.some(
        ([prerequisite, dependent]) =>
          dependent === key && remainingKeys.has(prerequisite),
      );
    });

    // If a future rule set introduces a cycle, retain source order instead of
    // dropping a listed skill or failing the comparison.
    ordered.push(remaining.splice(readyIndex < 0 ? 0 : readyIndex, 1)[0]!);
  }

  return ordered;
}

function resourceFor(skill: string): SkillGapLearningResource | null {
  return verifiedResources[canonicalSkill(skill)] ?? null;
}

export function calculateSkillGap(
  selectedJob: JobListing,
  inputSkills: string[],
  practiceSkills: string[] = [],
): SkillGapAnalysis {
  const requirements = distinctRequirements(selectedJob);
  const uniqueInputs: string[] = [];
  const seenInputs = new Set<string>();

  for (const input of inputSkills) {
    const trimmed = input.trim();
    const key = canonicalSkill(trimmed);
    if (!trimmed || seenInputs.has(key)) continue;
    seenInputs.add(key);
    uniqueInputs.push(trimmed);
  }

  const matchedInput = new Set<string>();
  const matchedSkills: SkillGapSkill[] = [];
  const missingSkills: SkillGapSkill[] = [];

  for (const requirement of requirements) {
    const matchingInput = uniqueInputs.find((input) =>
      requirementMatches(requirement.skill, input),
    );
    if (matchingInput) {
      matchedInput.add(canonicalSkill(matchingInput));
      matchedSkills.push({ ...requirement, matchedBy: matchingInput });
    } else {
      missingSkills.push(requirement);
    }
  }

  const matchedCount = matchedSkills.length;
  const requiredCount = requirements.length;
  const coveragePercent =
    requiredCount === 0
      ? null
      : Math.round((matchedCount / requiredCount) * 1000) / 10;
  const missingKeys = new Set(
    missingSkills.map(({ skill }) => canonicalSkill(skill)),
  );
  const selectedPracticeKeys = new Set(
    practiceSkills.map(canonicalSkill).filter(Boolean),
  );
  const selectedPracticeRequirements = new Set(
    matchedSkills
      .filter(({ skill }) => selectedPracticeKeys.has(canonicalSkill(skill)))
      .map(({ skill }) => canonicalSkill(skill)),
  );
  const plannedSkills = requirements.filter(({ skill }) => {
    const key = canonicalSkill(skill);
    return missingKeys.has(key) || selectedPracticeRequirements.has(key);
  });
  const roadmap = orderRoadmap(plannedSkills).map((step, index) => ({
    step: index + 1,
    skill: step.skill,
    category: step.category,
    estimatedHoursMin: step.category === "technical" ? 8 : 3,
    estimatedHoursMax: step.category === "technical" ? 16 : 8,
    learningResource: resourceFor(step.skill),
  }));

  return {
    selectedJob,
    matchedSkills,
    missingSkills,
    unmatchedInputSkills: uniqueInputs.filter(
      (input) => !matchedInput.has(canonicalSkill(input)),
    ),
    matchedCount,
    requiredCount,
    coveragePercent,
    coverageFormula:
      "Matched distinct listed requirements ÷ total distinct listed requirements × 100, rounded to 1 decimal place.",
    roadmapNote:
      "The roadmap includes requirements not recorded in your profile and any listed skills you chose to practise. Known prerequisites are placed first; other skills follow the job record order. This is a planning suggestion, not an employer priority or hiring prediction.",
    estimateNote:
      "These are rough planning estimates for a first guided practice only (technical skills: 8–16 study hours; soft skills: 3–8 practice hours). They are not course durations or guarantees of proficiency or job readiness.",
    roadmap,
  };
}
