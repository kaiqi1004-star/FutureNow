import assert from "node:assert/strict";
import test from "node:test";
import { matchingProfileInput } from "./matching-profile.ts";
import { emptyProfile, saveProfile, loadProfile, type SavedProfile } from "./skills-profile.ts";
import { skillCategories, skillGroups } from "./skill-catalogue.ts";

test("the preset library has no duplicate skill definitions and its other-technical option is non-scoring", () => {
  const entries = skillGroups.flatMap((group) => group.skills.map((name) => ({ name, category: group.category })));
  const keys = entries.map(({ name }) => name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase());
  assert.equal(new Set(keys).size, entries.length);
  const other = entries.filter(({ name }) => name === "Other technical skills");
  assert.deepEqual(other, [{ name: "Other technical skills", category: "Broad Technical Areas" }]);
  const p = emptyProfile();
  p.skills = [{ id: "other-broad", name: "Other technical skills", category: "Technical Skills", proficiency: "Expert", custom: true }];
  const saved: SavedProfile = { version: 1, profile: p, step: 1, submitted: false, savedAt: "2026-10-24T00:00:00.000Z" };
  assert.deepEqual(matchingProfileInput(saved).currentSkills, []);
  assert.deepEqual(p.skills[0], { id: "other-broad", name: "Other technical skills", category: "Technical Skills", proficiency: "Expert", custom: true });
});

test("Feature 2 reuses the saved Feature 1 envelope without rewriting it", () => {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  const profile = emptyProfile();
  profile.skills = [{ id: "sql", name: "SQL", category: "Technical Skills", proficiency: "Beginner", custom: true }];
  profile.experience.work = "Expert in Python and leadership"; // Deliberately not scored.
  profile.experience.evidenceItems = [{
    id: "evidence", kind: "Academic project", title: "Course project",
    skills: [{ skillId: "sql", skillName: "SQL" }], description: "Used SQL in coursework.",
    outcome: "Finished the assignment.", timing: "", reference: "",
  }];
  profile.interests.industries = ["Engineering"];
  assert.ok(saveProfile(profile, 1, false, storage).saved);
  const saved = loadProfile(storage).saved!;
  const before = JSON.stringify(saved);
  const input = matchingProfileInput(saved);
  assert.deepEqual(input.currentSkills, ["SQL"]);
  assert.deepEqual(Object.keys(input).sort(), ["currentSkills", "isDraft", "missingFields"]);
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

test("the six displayed skill categories stay ordered and broad areas never reach matching", () => {
  assert.deepEqual(skillCategories, [
    "Broad Technical Areas",
    "Technical Skills",
    "Industry-Specific Skills",
    "Digital Skills",
    "Soft Skills",
    "Languages",
  ]);
  assert.deepEqual([...new Set(skillGroups.map((group) => group.category))], skillCategories);
  const profile = emptyProfile();
  profile.skills = [
    { id: "broad", name: "Programming", category: "Broad Technical Areas", proficiency: "Beginner", custom: false },
    { id: "custom-broad", name: "Cybersecurity", category: "Technical Skills", proficiency: "Beginner", custom: true },
    { id: "specific", name: "SQL", category: "Technical Skills", proficiency: "Intermediate", custom: true },
  ];
  const saved: SavedProfile = { version: 1, profile, step: 1, submitted: false, savedAt: new Date().toISOString() };
  assert.deepEqual(matchingProfileInput(saved).currentSkills, ["SQL"]);
});
