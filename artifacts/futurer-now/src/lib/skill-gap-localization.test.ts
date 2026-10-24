import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  GENERAL_SKILL_TERMS, PROTECTED_SKILL_TERMS, SOURCE_FRAGMENT_TERMS, classifySkillTerm, deriveCategoryCounts,
  categoryMessage, careerCategoryMessages, formatIsoDate, formatNumber, localizeSkill, normalizeSkillKey,
} from './skill-gap-localization.ts';
import { skillGapMessages } from './skill-gap-messages.ts';
import { accessLabels, learningResources } from './reskilling-resources.ts';
import { skillGapRequirementKey } from './skill-gap-planner.ts';

type Job = { id: string; sector: string; technicalSkills: string[] | null; softSkills: string[] | null };
const jobs: Job[] = JSON.parse(readFileSync(new URL('../../../api-server/data/jobs.json', import.meta.url), 'utf8'));
const allSkills = [...new Set(jobs.flatMap((job) => [...(job.technicalSkills ?? []), ...(job.softSkills ?? [])]))];

test('every skill label in jobs.json is explicitly classified (no blanket fallback)', () => {
  const unknown = allSkills.filter((name) => classifySkillTerm(name) === 'unknown');
  assert.deepEqual(unknown, [], `Unclassified skill terms: ${unknown.join(', ')}`);
});

test('protected, fragment and general sets do not overlap', () => {
  for (const key of PROTECTED_SKILL_TERMS) {
    assert.ok(!GENERAL_SKILL_TERMS[key], `${key} is both protected and general`);
    assert.ok(!SOURCE_FRAGMENT_TERMS.has(key));
  }
  for (const key of SOURCE_FRAGMENT_TERMS) assert.ok(!GENERAL_SKILL_TERMS[key]);
});

test('general terms have non-empty BM and CN labels; protected terms and fragments stay original', () => {
  for (const [key, [bm, cn]] of Object.entries(GENERAL_SKILL_TERMS)) {
    assert.ok(bm.trim() && cn.trim(), `${key} missing translation`);
  }
  for (const name of ['Python', 'C#', 'Power BI', 'SolidWorks', 'AI tools (ChatGPT', 'Claude)']) {
    for (const language of ['EN', 'BM', 'CN'] as const) assert.equal(localizeSkill(name, language).label, name);
  }
  assert.equal(localizeSkill('problem-solving', 'BM').label, 'Penyelesaian masalah');
  assert.equal(localizeSkill('Teamwork', 'CN').label, '团队合作');
  assert.equal(localizeSkill('Teamwork', 'EN').label, 'Teamwork');
  assert.match(localizeSkill('Java/Python/C#/JavaScript/TypeScript (at least one)', 'BM').label, /sekurang-kurangnya satu/);
  assert.match(localizeSkill('Java/Python/C#/JavaScript/TypeScript (at least one)', 'CN').label, /至少一种/);
});

test('localization never changes the stored requirement key or original value', () => {
  for (const name of allSkills) {
    const localized = localizeSkill(name, 'CN');
    assert.equal(localized.original, name.trim());
    assert.equal(skillGapRequirementKey('technical', localized.original), skillGapRequirementKey('technical', name));
    assert.equal(localized.key, normalizeSkillKey(name));
  }
});

test('unknown terms remain visible in original form', () => {
  const result = localizeSkill('Underwater Basket Weaving', 'BM');
  assert.equal(result.kind, 'unknown');
  assert.equal(result.label, 'Underwater Basket Weaving');
});

test('career categories are derived from actual records with counts and all have catalog labels', () => {
  const counts = deriveCategoryCounts(jobs);
  assert.equal(counts.reduce((sum, item) => sum + item.count, 0), jobs.length);
  for (const { category } of counts) {
    assert.ok(careerCategoryMessages[category], `No label for ${category}`);
    const info = categoryMessage(category);
    assert.ok(skillGapMessages[info.label] && skillGapMessages[info.description], `${category} label not in catalog`);
  }
  assert.equal(categoryMessage('future-thing').label, 'Future Thing');
});

test('every resource description, duration, access note, credential, match note and access label is translated', () => {
  const strings = new Set<string>(Object.values(accessLabels));
  for (const resource of learningResources) {
    [resource.duration, resource.accessNote, resource.credential, resource.overview].filter(Boolean).forEach((value) => strings.add(value));
    resource.matches.forEach((match) => { if (match.note) strings.add(match.note); });
  }
  for (const value of strings) {
    const entry = skillGapMessages[value];
    assert.ok(entry, `Missing catalog entry: ${value}`);
    assert.ok(entry[1].trim() && entry[2].trim() && entry[1] !== '' && entry[2] !== '');
  }
});

test('numbers and dates are locale-aware without shifting the source date', () => {
  assert.equal(formatNumber(12000, 'EN'), '12,000');
  assert.match(formatIsoDate('2026-10-24', 'CN'), /2026.*10.*24/);
  assert.match(formatIsoDate('2026-10-24', 'BM'), /24/);
  assert.equal(formatIsoDate('not-a-date', 'EN'), 'not-a-date');
});
