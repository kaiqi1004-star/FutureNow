import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyProfile, loadProfile, saveProfile, validateProfile, validateSection, missingInformation, transferableStrengths, PROFILE_KEY, type SkillsProfile } from './skills-profile.ts';

function complete(): SkillsProfile {
  const p = emptyProfile();
  p.basic = { status: 'Student', field: 'Engineering', years: 0, education: 'Diploma', direction: 'Build products' };
  p.skills = [{ id: 'skill-1', name: 'Communication', category: 'Soft Skills', proficiency: 'Advanced', custom: false }];
  p.interests = { industries: ['Engineering'], activities: ['Design'], priorities: ['Impact'], willingness: 4, weeklyHours: 0, budget: 'Free only' };
  p.readiness = { technology: 4, problemApproach: 'Research and ask for help', adaptability: 5, realisticHours: 0 };
  return p;
}
test('required sections validate; experience is optional and zero hours/years are valid', () => {
  assert.equal(Object.keys(validateSection(emptyProfile(), 0)).length, 5);
  assert.deepEqual(validateSection(emptyProfile(), 2), {});
  assert.deepEqual(validateProfile(complete()), {});
});
test('invalid numeric values and duplicate skills rejected', () => {
  const p = complete();
  p.basic.years = -1; p.interests.weeklyHours = 169; p.readiness.realisticHours = NaN;
  p.skills.push({ ...p.skills[0], id: 'second', name: ' communication ' });
  const e = validateProfile(p);
  for (const key of ['basic.years', 'interests.weeklyHours', 'readiness.realisticHours', 'skills']) assert.ok(e[key]);
});
test('draft and submitted profiles roundtrip and edits replace previous save', () => {
  const data = new Map<string, string>();
  const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
  assert.equal(saveProfile(emptyProfile(), 2, false, storage).saved?.step, 2);
  assert.equal(loadProfile(storage).saved?.submitted, false);
  const p = complete();
  assert.equal(saveProfile(p, 4, true, storage).error, null);
  assert.deepEqual(loadProfile(storage).saved?.profile, p);
  p.basic.field = 'Updated field'; saveProfile(p, 0, true, storage);
  assert.equal(loadProfile(storage).saved?.profile.basic.field, 'Updated field');
  assert.ok(data.has(PROFILE_KEY));
});
test('empty, corrupt, unsupported-version, malformed and blocked reads handled without changing stored data', () => {
  assert.deepEqual(loadProfile({ getItem: () => null, setItem: () => {} }), { saved: null, error: null });
  for (const raw of ['not-json', '{"version":2}', '{"version":1,"profile":{}}']) {
    let written = false;
    const r = loadProfile({ getItem: () => raw, setItem: () => { written = true; } });
    assert.equal(r.saved, null); assert.ok(r.error); assert.equal(written, false);
  }
  assert.ok(loadProfile({ getItem: () => { throw Error('blocked'); }, setItem: () => {} }).error);
});
test('quota and blocked writes never report successful saving', () => {
  for (const message of ['QuotaExceededError', 'SecurityError']) {
    const r = saveProfile(complete(), 4, true, { getItem: () => null, setItem: () => { throw Error(message); } });
    assert.equal(r.saved, null); assert.match(r.error!, /not saved/i);
  }
});
test('saved shape validation catches invalid proficiency', () => {
  const p = complete(); (p.skills[0] as { proficiency: string }).proficiency = 'Genius';
  let written = false;
  assert.ok(saveProfile(p, 1, false, { getItem: () => null, setItem: () => { written = true; } }).error);
  assert.equal(written, false);
});
test('strengths trace to exact responses; no inference from free-text achievements', () => {
  const p = complete();
  const strengths = transferableStrengths(p);
  assert.equal(strengths.length, 3);
  assert.ok(strengths.every(s => s.source && s.explanation));
  assert.match(strengths[0].explanation, /Advanced/);
  p.skills = []; p.readiness.technology = 2; p.readiness.adaptability = 3;
  p.experience.achievements = 'I am an expert leader';
  assert.deepEqual(transferableStrengths(p), []);
});
test('missing evidence, skip and inconsistent hours are explicit', () => {
  const p = complete(); p.experience.skipped = true; p.readiness.realisticHours = 5;
  const missing = missingInformation(p);
  assert.ok(missing.some(s => /skipped/.test(s)));
  assert.ok(missing.some(s => /Certifications/.test(s)));
  assert.ok(missing.some(s => /differs/.test(s)));
});
