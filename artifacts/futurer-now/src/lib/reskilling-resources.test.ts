import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildResourceRecommendations,
  candidateProviders,
  findResourceMatch,
  learningResources,
  resourceVerifiedOn,
} from './reskilling-resources.ts';

test('candidate provider directory contains the eight requested sources', () => {
  assert.deepEqual(candidateProviders.map((provider) => provider.name), [
    'eLATiH', 'Microsoft Learn', 'IBM SkillsBuild', 'AWS Skill Builder',
    'Cisco Networking Academy', 'Google Skillshop', 'HubSpot Academy', 'freeCodeCamp',
  ]);
  assert.equal(new Set(candidateProviders.map((provider) => provider.name)).size, 8);
  for (const provider of candidateProviders) assert.equal(new URL(provider.url).protocol, 'https:');
});

test('every resource has an official HTTPS URL and makes unknown course facts explicit', () => {
  assert.ok(learningResources.length >= 10);
  assert.equal(new Set(learningResources.map((resource) => resource.id)).size, learningResources.length);
  for (const resource of learningResources) {
    assert.equal(new URL(resource.url).protocol, 'https:');
    if (resource.id === 'elatih-catalogue') {
      assert.equal(resource.lastVerifiedOn, null);
    } else {
      assert.equal(resource.lastVerifiedOn, resourceVerifiedOn);
    }
    assert.ok(resource.duration.trim());
    assert.ok(resource.credential.trim());
    assert.ok(resource.accessNote.trim());
    if (resource.kind === 'provider-catalogue') {
      assert.match(resource.overview, /catalogue/i);
    }
    const expectedDomain: Record<string, string> = {
      'Microsoft Learn': 'learn.microsoft.com',
      'IBM SkillsBuild': 'skillsbuild.org',
      'Cisco Networking Academy': 'netacad.com',
      'Google Skillshop': 'skillshop.withgoogle.com',
      'HubSpot Academy': 'academy.hubspot.com',
      freeCodeCamp: 'freecodecamp.org',
      eLATiH: 'elatih.hrdcorp.gov.my',
      'AWS Skill Builder': 'skillbuilder.aws',
    };
    const hostname = new URL(resource.url).hostname;
    assert.ok(hostname === expectedDomain[resource.provider] || hostname.endsWith(`.${expectedDomain[resource.provider]}`));
    for (const match of resource.matches) {
      for (const pattern of match.patterns) assert.doesNotThrow(() => new RegExp(pattern, 'i'));
    }
  }
});

test('recommendations are tied to missing source-skill names, with catalogue links disclosed as such', () => {
  const python = buildResourceRecommendations(['Python']);
  assert.ok(python.some(({ resource }) => resource.id === 'cisco-python-essentials'));
  assert.ok(python.some(({ resource }) => resource.id === 'fcc-python'));
  assert.ok(python.some(({ resource }) => resource.provider === 'eLATiH'));
  assert.ok(python.every(({ skills }) => skills.some((skill) => skill.name === 'Python')));
  assert.equal(findResourceMatch(
    learningResources.find((resource) => resource.id === 'elatih-catalogue')!,
    'Mechanical design',
  )?.type, 'catalogue-search');
  assert.equal(learningResources.find((resource) => resource.id === 'elatih-catalogue')!.lastVerifiedOn, null);
  assert.equal(buildResourceRecommendations(['Mechanical design'])
    .filter(({ resource }) => resource.kind === 'course').length, 0);
  const ibmDataCatalogue = learningResources.find((resource) => resource.id === 'ibm-data-catalogue')!;
  assert.equal(ibmDataCatalogue.kind, 'provider-catalogue');
  assert.equal(ibmDataCatalogue.access, 'varies');
  assert.equal(buildResourceRecommendations(['Data preparation'])
    .find(({ resource }) => resource.provider === 'IBM SkillsBuild')?.resource.kind, 'provider-catalogue');
});

test('provider and access filters are applied without relabeling unknown resources as free', () => {
  const filtered = buildResourceRecommendations(['Python'], {
    provider: 'freeCodeCamp',
    access: 'free',
  });
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every(({ resource }) => resource.provider === 'freeCodeCamp' && resource.access === 'free'));
  assert.ok(buildResourceRecommendations(['Python'], { access: 'not-stated' })
    .every(({ resource }) => resource.access === 'not-stated'));
});
