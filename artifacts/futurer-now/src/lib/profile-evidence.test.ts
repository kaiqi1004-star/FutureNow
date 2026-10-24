import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyProfile, type EvidenceItem } from './skills-profile.ts';
import { evidenceForMatchedSkill, evidenceHasContent, safeEvidenceUrl } from './profile-evidence.ts';

const entry: EvidenceItem = {
  id: 'evidence-1',
  kind: 'Academic project',
  title: 'University data project',
  skills: [{ skillId: 'python', skillName: 'Python' }],
  description: 'Cleaned and analysed a small dataset using Python.',
  outcome: '',
  timing: '2025 · one semester',
  reference: 'CERT-2025-1',
};

test('only explicitly linked evidence appears beside its exact matched profile skill', () => {
  const profile = emptyProfile();
  profile.skills = [
    { id: 'python', name: 'Python', category: 'Technical Skills', proficiency: 'Beginner', custom: true },
    { id: 'sql', name: 'SQL', category: 'Technical Skills', proficiency: 'Beginner', custom: true },
  ];
  profile.experience.evidenceItems = [entry, { ...entry, id: 'other', skills: [{ skillId: 'sql', skillName: 'SQL' }] }];

  assert.deepEqual(evidenceForMatchedSkill(profile, 'Python'), [entry]);
  assert.deepEqual(evidenceForMatchedSkill(profile, ' python '), [entry]);
  assert.deepEqual(evidenceForMatchedSkill(profile, 'Programming'), []);
  assert.deepEqual(evidenceForMatchedSkill(profile, null), []);
});

test('free-text notes and empty evidence cards never imply a linked skill', () => {
  const profile = emptyProfile();
  profile.skills = [{ id: 'python', name: 'Python', category: 'Technical Skills', proficiency: 'Beginner', custom: true }];
  profile.experience.achievements = 'I used Python'; // Must not be mined for a match.
  profile.experience.evidenceItems = [{ ...entry, skills: [], title: '', description: '', timing: '', reference: '' }];

  assert.equal(evidenceHasContent(profile.experience.evidenceItems[0]), false);
  assert.deepEqual(evidenceForMatchedSkill(profile, 'Python'), []);
});

test('certificate references remain plain text and only http(s) references can be linked', () => {
  assert.equal(safeEvidenceUrl('https://example.org/certificate'), 'https://example.org/certificate');
  assert.equal(safeEvidenceUrl('http://example.org/portfolio'), 'http://example.org/portfolio');
  assert.equal(safeEvidenceUrl('javascript:alert(1)'), null);
  assert.equal(safeEvidenceUrl('CERT-2025-1'), null);
});
