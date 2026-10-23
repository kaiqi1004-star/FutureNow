import assert from "node:assert/strict";
import test from "node:test";
import { matchingProfileInput } from "./matching-profile.ts";
import { emptyProfile, saveProfile, loadProfile, type SavedProfile } from "./skills-profile.ts";

test("Feature 2 reuses the saved Feature 1 envelope without rewriting it", () => {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  const profile = emptyProfile();
  profile.skills = [{ id: "sql", name: "SQL", category: "Technical Skills", proficiency: "Beginner", custom: true }];
  profile.experience.work = "Expert in Python and leadership"; // Deliberately not scored.
  profile.interests.industries = ["Engineering"];
  assert.ok(saveProfile(profile, 1, false, storage).saved);
  const saved = loadProfile(storage).saved!;
  const before = JSON.stringify(saved);
  const input = matchingProfileInput(saved);
  assert.deepEqual(input.currentSkills, ["SQL"]);
  assert.equal(input.isDraft, true);
  assert.ok(input.missingFields.length);
  assert.equal(JSON.stringify(saved), before);
  assert.deepEqual(loadProfile(storage).saved, saved);
});

test("missing and incomplete saved profiles produce useful prompts without inventing skills", () => {
  const input = matchingProfileInput(null);
  assert.deepEqual(input.currentSkills, []);
  assert.ok(input.missingFields.length);
  const saved: SavedProfile = { version: 1, profile: emptyProfile(), step: 0, submitted: false, savedAt: new Date().toISOString() };
  assert.deepEqual(matchingProfileInput(saved).currentSkills, []);
  assert.ok(matchingProfileInput(saved).missingFields.length);
});
