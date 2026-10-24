import assert from 'node:assert/strict';
import { test } from 'node:test';
import { translateMessage, translationCatalog, type Language } from './i18n.tsx';
import { accessLabels, learningResources } from './reskilling-resources.ts';
import { careerCategoryMessages } from './skill-gap-localization.ts';

test('each translation key supplies non-empty English, Bahasa Melayu, and Simplified Chinese copy', () => {
  const entries = Object.entries(translationCatalog);
  assert.ok(entries.length > 0);
  for (const [key, values] of entries) {
    assert.equal(values.length, 3, `${key} must have all three language values`);
    assert.ok(values.every((value) => value.trim()), `${key} must not fall back from an empty translation`);
  }
});

test('shared module terminology follows the same BM and Simplified Chinese standard', () => {
  const terms = [
    ['Skills Profile', 'Profil Kemahiran', '技能档案'],
    ['Basic information', 'Maklumat Asas', '基本信息'],
    ['Current skills', 'Kemahiran Semasa', '现有技能'],
    ['Industry-Specific Skills', 'Kemahiran Khusus Industri', '行业专属技能'],
    ['All changes saved', 'Semua Perubahan Telah Disimpan', '所有更改已保存'],
    ['Scenario Planning', 'Perancangan Senario', '情景规划'],
    ['Skill Gap Navigator', 'Panduan Jurang Kemahiran', '技能差距导航'],
  ] as const;
  for (const [key, bm, cn] of terms) {
    assert.equal(translateMessage(key, 'BM'), bm);
    assert.equal(translateMessage(key, 'CN'), cn);
  }
});

test('translated templates interpolate user values and unknown messages fall back to their English ID', () => {
  const message = 'You selected {skill} and rated your proficiency as {proficiency}. This is self-reported, not independently verified.';
  const rendered = translateMessage(message, 'BM' satisfies Language, { skill: 'Teamwork', proficiency: 'Asas' });
  assert.match(rendered, /Teamwork/);
  assert.match(rendered, /Asas/);
  assert.ok(!rendered.includes('{skill}'));
  assert.equal(translateMessage('Uncatalogued English fallback', 'CN'), 'Uncatalogued English fallback');
});

test('Skill Gap Navigator copy is localized in all supported languages while listing names stay verbatim', () => {
  const sourceSkill = 'Power BI';
  const key = 'The selected listing names “{skill}” as a requirement.';
  for (const language of ['EN', 'BM', 'CN'] satisfies Language[]) {
    const copy = translateMessage(key, language, { skill: sourceSkill });
    assert.ok(copy.includes(sourceSkill));
    assert.ok(!copy.includes('{skill}'));
    assert.ok(copy.trim());
  }
  assert.notEqual(translateMessage('Choose a career goal', 'BM'), 'Choose a career goal');
  assert.notEqual(translateMessage('Choose a career goal', 'CN'), 'Choose a career goal');
});

test('the merged catalog localizes career labels and all resource descriptions without fallback', () => {
  const keys = new Set([
    ...Object.values(accessLabels),
    ...Object.values(careerCategoryMessages).flatMap(({ label, description }) => [label, description]),
    ...learningResources.flatMap((resource) => [
      resource.duration, resource.accessNote, resource.credential, resource.overview,
      ...resource.matches.map((match) => match.note ?? ''),
    ]),
  ].filter(Boolean));
  for (const key of keys) {
    for (const language of ['BM', 'CN'] as const) {
      assert.ok(translationCatalog[key], `Missing ${key}`);
      assert.notEqual(translateMessage(key, language), key, `${language} falls back to English: ${key}`);
    }
  }
});
