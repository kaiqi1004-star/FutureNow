import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fallbackListingOrder, isJobDataset, matchingFailureKind } from './job-fallback.ts';
import { skillGroups } from './skill-catalogue.ts';
import type { JobListing } from '@workspace/api-client-react';

const jobs: JobListing[] = JSON.parse(readFileSync(new URL('../../../api-server/data/jobs.json', import.meta.url), 'utf8'));
test('fallback retains all 50 original jobs with no calculated score fields or mutations', () => {
  const before = JSON.stringify(jobs);
  const order = fallbackListingOrder(jobs, ['SQL', 'My honest custom skill']);
  assert.equal(order.length, 50);
  assert.equal(new Set(order.map((job) => job.id)).size, 50);
  assert.deepEqual(fallbackListingOrder([...jobs].reverse(), ['SQL', 'My honest custom skill']), order);
  assert.ok(order.every((job) => !('overallScore' in job) && !('compatibilityLabel' in job)));
  assert.equal(JSON.stringify(jobs), before);
  assert.deepEqual(fallbackListingOrder(jobs, []).map((job) => job.id), Array.from({ length: 50 }, (_, i) => `J${i + 1}`));
});
test('service, validation, unavailable, empty and malformed data states stay distinct', () => {
  assert.equal(matchingFailureKind(new Error('network')), 'service');
  assert.equal(matchingFailureKind({ status: 400 }), 'profile');
  assert.equal(matchingFailureKind({ status: 503, data: { code: 'JOB_DATA_UNAVAILABLE' } }), 'data');
  assert.ok(isJobDataset(jobs));
  assert.ok(isJobDataset([]));
  assert.equal(isJobDataset({ error: 'failure' }), false);
  assert.equal(isJobDataset([{ title: 'incomplete' }]), false);
});
test('catalogue is grouped, duplicate-free and specific additions are evidenced by source records', () => {
  const names = skillGroups.flatMap((group) => group.skills);
  assert.equal(new Set(names.map((skill) => skill.toLowerCase())).size, names.length);
  const source = jobs.flatMap((job) => [...job.technicalSkills, ...job.softSkills]).map((skill) => skill.toLowerCase());
  const broadDigitalPresets = new Set(['Digital literacy', 'Productivity tools', 'Online collaboration']);
  for (const group of skillGroups.filter((item) => !item.broad)) {
    for (const skill of group.skills) {
      // These broad digital starters are preserved for exploration; Java and
      // TypeScript are present in an explicit source-listed one-of alternative.
      assert.ok(
        source.includes(skill.toLowerCase())
        || broadDigitalPresets.has(skill)
        || (skill === 'Mandarin' && jobs.some((job) => /Mandarin/i.test(job.title)))
        || (['Java', 'TypeScript'].includes(skill) && source.some((text) => text.includes('java/python/c#/javascript/typescript (at least one)'))),
        skill,
      );
    }
  }
  assert.ok(names.includes('Mandarin') && jobs.some((job) => /Mandarin Speaking/.test(job.title)));
});
