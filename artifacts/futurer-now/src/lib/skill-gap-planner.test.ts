import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultSkillAssessments,
  loadSkillGapPlan,
  saveSkillGapPlan,
  skillGapRequirementKey,
  type SkillGapPlanState,
} from "./skill-gap-planner.ts";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    values,
  };
}

test("defaults matched requirements to profile and unmatched ones to unrecorded", () => {
  const statuses = defaultSkillAssessments(
    [{ category: "technical", skill: "SQL" }],
    [{ category: "soft", skill: "Communication" }],
  );

  assert.equal(statuses[skillGapRequirementKey("technical", "SQL")], "in-profile");
  assert.equal(
    statuses[skillGapRequirementKey("soft", "Communication")],
    "unrecorded",
  );
});

test("persists all three progress states and assessment choices on this device", () => {
  const storage = memoryStorage();
  const state: SkillGapPlanState = {
    version: 2,
    assessments: {
      "technical:react": "practice",
      "soft:communication": "unrecorded",
    },
    progress: {
      "technical:react": "in-progress",
      "soft:communication": "completed",
    },
  };

  assert.equal(saveSkillGapPlan("J1", state, storage), null);
  assert.deepEqual(loadSkillGapPlan("J1", storage), { state, error: null });
});

test("migrates the earlier completed-step map without losing completed work", () => {
  const storage = memoryStorage({
    "futurenow-skill-gap-completed:J1": JSON.stringify({
      "technical:React": true,
      "soft:Communication": false,
    }),
  });

  const result = loadSkillGapPlan("J1", storage);
  assert.equal(result.error, null);
  assert.equal(result.state.progress["technical:react"], "completed");
  assert.equal(result.state.progress["soft:communication"], "not-started");
});

test("does not erase unreadable saved plan data", () => {
  const storage = memoryStorage({
    "futurenow-skill-gap-completed:J1": "{invalid",
  });

  const result = loadSkillGapPlan("J1", storage);
  assert.match(result.error ?? "", /left unchanged/i);
  assert.equal(storage.values.get("futurenow-skill-gap-completed:J1"), "{invalid");
});

test("reports when browser storage cannot save progress", () => {
  const storage = {
    setItem: () => {
      throw new Error("storage blocked");
    },
  };

  const error = saveSkillGapPlan(
    "J1",
    { version: 2, assessments: {}, progress: {} },
    storage,
  );
  assert.match(error ?? "", /not saved/i);
});
