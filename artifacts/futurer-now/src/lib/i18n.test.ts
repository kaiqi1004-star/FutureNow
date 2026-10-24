import assert from 'node:assert/strict';
import { test } from 'node:test';
import { translateMessage, translationCatalog, type Language } from './i18n.tsx';

test('each translation key supplies non-empty English, Bahasa Melayu, and Simplified Chinese copy', () => {
  const entries = Object.entries(translationCatalog);
  assert.ok(entries.length > 0);
  for (const [key, values] of entries) {
    assert.equal(values.length, 3, `${key} must have all three language values`);
    assert.ok(values.every((value) => value.trim()), `${key} must not fall back from an empty translation`);
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
