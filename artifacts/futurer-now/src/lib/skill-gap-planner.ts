export type SkillAssessment = "in-profile" | "practice" | "unrecorded";
export type LearningProgress = "not-started" | "in-progress" | "completed";

export type SkillGapPlanState = {
  version: 2;
  assessments: Record<string, SkillAssessment>;
  progress: Record<string, LearningProgress>;
};

export type SkillGapPlanStorage = Pick<Storage, "getItem" | "setItem">;

const legacyStorageKey = (jobId: string) =>
  `futurenow-skill-gap-completed:${jobId}`;

const emptyState = (): SkillGapPlanState => ({
  version: 2,
  assessments: {},
  progress: {},
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const assessmentValues = new Set<SkillAssessment>([
  "in-profile",
  "practice",
  "unrecorded",
]);
const progressValues = new Set<LearningProgress>([
  "not-started",
  "in-progress",
  "completed",
]);

function readStatusMap<T extends string>(
  input: unknown,
  allowed: Set<T>,
): Record<string, T> | null {
  if (!isRecord(input)) return null;
  const result: Record<string, T> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" && allowed.has(value as T)) {
      result[key] = value as T;
    }
  }
  return result;
}

export function skillGapRequirementKey(category: string, skill: string): string {
  return `${category}:${skill.normalize("NFKC").trim().toLocaleLowerCase("en").replace(/\s+/g, " ")}`;
}

function normalizeLegacyRequirementKey(key: string): string {
  const separator = key.indexOf(":");
  if (separator < 0) return key;
  const category = key.slice(0, separator).toLocaleLowerCase("en");
  if (category !== "technical" && category !== "soft") return key;
  return skillGapRequirementKey(category, key.slice(separator + 1));
}

export function loadSkillGapPlan(
  jobId: string,
  storage?: Pick<SkillGapPlanStorage, "getItem">,
): { state: SkillGapPlanState; error: string | null } {
  try {
    const raw = (storage ?? window.localStorage).getItem(legacyStorageKey(jobId));
    if (!raw) return { state: emptyState(), error: null };

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return {
        state: emptyState(),
        error: "Saved plan data could not be read. It has been left unchanged.",
      };
    }

    if (parsed.version === 2) {
      const assessments = readStatusMap(parsed.assessments, assessmentValues);
      const progress = readStatusMap(parsed.progress, progressValues);
      if (!assessments || !progress) {
        return {
          state: emptyState(),
          error: "Saved plan data could not be read. It has been left unchanged.",
        };
      }
      return {
        state: { version: 2, assessments, progress },
        error: null,
      };
    }

    // Earlier versions stored { "category:skill": boolean } under this key.
    const legacyEntries = Object.entries(parsed);
    if (legacyEntries.every(([, value]) => typeof value === "boolean")) {
      return {
        state: {
          ...emptyState(),
          progress: Object.fromEntries(
            legacyEntries.map(([key, done]) => [
              normalizeLegacyRequirementKey(key),
              done ? "completed" : "not-started",
            ]),
          ) as Record<string, LearningProgress>,
        },
        error: null,
      };
    }

    return {
      state: emptyState(),
      error: "Saved plan data could not be read. It has been left unchanged.",
    };
  } catch {
    return {
      state: emptyState(),
      error: "Saved plan data could not be read and has been left unchanged. Browser storage may be blocked.",
    };
  }
}

export function saveSkillGapPlan(
  jobId: string,
  state: SkillGapPlanState,
  storage?: Pick<SkillGapPlanStorage, "setItem">,
): string | null {
  try {
    const assessments = readStatusMap(state.assessments, assessmentValues);
    const progress = readStatusMap(state.progress, progressValues);
    if (!assessments || !progress) {
      return "Plan progress was not saved because it contains an unsupported status.";
    }
    (storage ?? window.localStorage).setItem(
      legacyStorageKey(jobId),
      JSON.stringify({ version: 2, assessments, progress }),
    );
    return null;
  } catch {
    return "Plan progress was not saved. Browser storage may be blocked or full.";
  }
}

export function defaultSkillAssessments(
  matchedSkills: Array<{ skill: string; category: string }>,
  missingSkills: Array<{ skill: string; category: string }>,
): Record<string, SkillAssessment> {
  return {
    ...Object.fromEntries(
      matchedSkills.map(({ skill, category }) => [
        skillGapRequirementKey(category, skill),
        "in-profile",
      ]),
    ),
    ...Object.fromEntries(
      missingSkills.map(({ skill, category }) => [
        skillGapRequirementKey(category, skill),
        "unrecorded",
      ]),
    ),
  };
}
