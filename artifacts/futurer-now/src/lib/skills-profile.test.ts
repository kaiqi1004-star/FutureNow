import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyProfile, loadProfile, profileSchema, saveProfile, validateProfile, validateSection, missingInformation, transferableStrengths, PROFILE_KEY, type SkillsProfile } from './skills-profile.ts';

function complete(): SkillsProfile {
  const p = emptyProfile();
  p.basic = { status: 'Student', field: 'Engineering', years: 0, relevantYears: '', education: 'Diploma', direction: 'Build products' };
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
test('validation messages use injected translations without changing profile fields', () => {
  const dictionary: Record<string, string> = { 'Current status': 'Status semasa', 'Field of study or occupation': 'Bidang pengajian atau pekerjaan', '{field} is required.': '{field} diperlukan.' };
  const translate = (message: string, values: Record<string, string | number> = {}) =>
    (dictionary[message] ?? message).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
  const errors = validateSection(emptyProfile(), 0, translate);
  assert.equal(errors['basic.status'], 'Status semasa diperlukan.');
  assert.equal(errors['basic.field'], 'Bidang pengajian atau pekerjaan diperlukan.');
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
test('legacy combined language categories migrate without changing names, IDs or evidence references', () => {
  const base = emptyProfile();
  const parsed = profileSchema.safeParse({
    ...base,
    basic: { ...base.basic, relevantYears: undefined },
    skills: [
      { id: 'soft-legacy', name: 'Communication', category: 'Soft Skills & Languages', proficiency: 'Advanced', custom: false },
      { id: 'excel-legacy', name: 'Microsoft Excel', category: 'Technical Skills', proficiency: 'Intermediate', custom: false },
      { id: 'custom-legacy', name: 'Korean', category: 'Soft Skills & Languages', proficiency: 'Beginner', custom: true },
      { id: 'english-legacy', name: 'English Communication', category: 'Soft Skills & Languages', proficiency: 'Intermediate', custom: false },
      { id: 'mandarin-legacy', name: 'Mandarin', category: 'Soft Skills & Languages', proficiency: 'Advanced', custom: false },
    ],
    experience: {
      ...base.experience,
      evidenceItems: [{
        id: 'evidence-legacy', kind: 'Academic project', title: 'Coursework',
        skills: [{ skillId: 'soft-legacy', skillName: 'Communication' }],
        description: '', outcome: '', timing: '', reference: '',
      }],
    },
  });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.basic.relevantYears, undefined);
  assert.deepEqual(parsed.data.skills.map(({ id, name, category }) => ({ id, name, category })), [
    { id: 'soft-legacy', name: 'Communication', category: 'Soft Skills' },
    { id: 'excel-legacy', name: 'Microsoft Excel', category: 'Digital Skills' },
    { id: 'custom-legacy', name: 'Korean', category: 'Languages' },
    { id: 'english-legacy', name: 'English Communication', category: 'Languages' },
    { id: 'mandarin-legacy', name: 'Mandarin', category: 'Languages' },
  ]);
  assert.deepEqual(parsed.data.experience.evidenceItems[0].skills, [{ skillId: 'soft-legacy', skillName: 'Communication' }]);
});
test('language skills remain available to matching but are not classified as transferable soft skills', async () => {
  const { matchingProfileInput } = await import('./matching-profile.ts');
  const p = complete();
  p.skills.push({ id: 'language-1', name: 'Mandarin', category: 'Languages', proficiency: 'Advanced', custom: false });
  const stored = { version: 1 as const, profile: p, submitted: true, step: 5, savedAt: new Date().toISOString() };
  assert.deepEqual(matchingProfileInput(stored).currentSkills, ['Communication', 'Mandarin']);
  const strengths = transferableStrengths(p).map(({ name }) => name);
  assert.ok(strengths.includes('Communication'));
  assert.ok(!strengths.includes('Mandarin'));
});
test('structured evidence is optional, editable, and roundtrips with skill references', () => {
  const data = new Map<string, string>();
  const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
  const p = complete();
  p.experience.evidenceItems = [{
    id: 'evidence-1', kind: 'Academic project', title: 'Course project',
    skills: [{ skillId: 'skill-1', skillName: 'Communication' }],
    description: 'Presented a research summary to classmates.', outcome: '', timing: '2025', reference: 'CERT-123',
  }];
  assert.equal(saveProfile(p, 2, false, storage).error, null);
  assert.deepEqual(loadProfile(storage).saved?.profile.experience.evidenceItems, p.experience.evidenceItems);
  p.experience.evidenceItems[0].outcome = 'Completed the presentation.';
  p.experience.evidenceItems = p.experience.evidenceItems.filter((item) => item.id !== 'evidence-1');
  assert.equal(saveProfile(p, 2, false, storage).error, null);
  assert.deepEqual(loadProfile(storage).saved?.profile.experience.evidenceItems, []);
});
test('old version-1 profiles without structured evidence load without losing existing notes', () => {
  const p = complete();
  p.experience.academic = 'Legacy project note';
  const { evidenceItems: _ignored, ...oldExperience } = p.experience;
  const raw = JSON.stringify({
    version: 1, profile: { ...p, experience: oldExperience }, step: 2, submitted: false, savedAt: new Date().toISOString(),
  });
  const storage = { getItem: () => raw, setItem: () => {} };
  const loaded = loadProfile(storage);
  assert.equal(loaded.error, null);
  assert.equal(loaded.saved?.profile.experience.academic, 'Legacy project note');
  assert.deepEqual(loaded.saved?.profile.experience.evidenceItems, []);
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
  assert.ok(strengths.every(s => s.source.key && s.explanation.key));
  assert.equal(strengths[0].explanation.values?.proficiency, 'Advanced');
  assert.equal(strengths[0].nameIsKey, true);
  p.skills[0].custom = true;
  assert.equal(transferableStrengths(p)[0].nameIsKey, false);
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
