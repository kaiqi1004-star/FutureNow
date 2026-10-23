import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { buildResourceRecommendations } from '../src/lib/reskilling-resources.ts';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});
const baseURL = (process.env.TEST_BASE_URL || 'http://127.0.0.1:80').replace(/\/$/, '');
const profileKey = 'futurenow.skills-profile.v1';
const errors = [];
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const check = (name, fn) => fn().then(() => console.log(`PASS: ${name}`));

const profile = {
  version: 1,
  profile: {
    basic: { status: 'Student', field: 'Software', years: 0, education: 'Diploma', direction: '' },
    skills: [{
      id: 'test-python', name: 'Python', category: 'Technical Skills',
      proficiency: 'Intermediate', custom: false,
    }],
    experience: {
      academic: '', work: 'This private note must not be sent to the matcher.', personal: '',
      examples: '', certifications: '', achievements: '', skipped: false,
    },
    interests: {
      industries: [], activities: [], priorities: [], willingness: '', weeklyHours: 5, budget: 'Low-cost',
    },
    readiness: { technology: '', problemApproach: '', adaptability: '', realisticHours: 5 },
  },
  step: 4,
  submitted: true,
  savedAt: '2026-10-24T00:00:00.000Z',
};

try {
  const publicContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const publicPage = await publicContext.newPage();
  const publicMatcherRequests = [];
  publicPage.on('pageerror', (error) => errors.push(error.message));
  publicPage.on('request', (request) => {
    if (request.url().endsWith('/api/future-ready/role-matches')) publicMatcherRequests.push(request);
  });

  const jobsResponse = await publicPage.request.get(`${baseURL}/api/future-ready/jobs`);
  assert.equal(jobsResponse.status(), 200);
  assert.match(jobsResponse.headers()['content-type'] || '', /application\/json/i);
  const jobs = await jobsResponse.json();
  assert.equal(jobs.length, 50, 'The live API should return the authoritative 50-record dataset');

  await publicPage.goto(`${baseURL}/scenario-planning`);
  await publicPage.getByTestId('status-scenario-no-profile').waitFor();
  await publicPage.getByTestId('card-scenario-moderate').waitFor();
  await publicPage.getByTestId('card-scenario-fast').waitFor();

  await check('hypothetical scenarios, evidence scope and source metadata are visible without a profile', async () => {
    assert.equal(await publicPage.getByTestId('select-scenario-category').locator('option').count(), 6);
    assert.match(await publicPage.getByTestId('notice-scenario-caveat').innerText(), /not validated predictions/i);
    assert.match(await publicPage.getByTestId('text-moderate-opportunity-1').innerText(), /potential benefit/i);
    assert.match(await publicPage.getByTestId('text-fast-challenge-1').innerText(), /not a forecast/i);
    for (const id of ['world-bank-2026', 'ilo-2025', 'wef-2025']) {
      await publicPage.getByTestId(`card-scenario-source-${id}`).waitFor();
      assert.ok(await publicPage.getByTestId(`link-scenario-source-${id}`).getAttribute('href'));
    }
    assert.match(await publicPage.getByTestId('card-scenario-source-world-bank-2026').innerText(), /45%/);
    assert.match(await publicPage.getByTestId('card-scenario-source-ilo-2025').innerText(), /one in four/i);
    assert.match(await publicPage.getByTestId('card-scenario-source-wef-2025').innerText(), /85%/);
    assert.match(await publicPage.getByTestId('card-scenario-source-wef-2025').innerText(), /63%/);
    assert.equal(publicMatcherRequests.length, 0, 'A missing profile must not trigger the matcher');
  });

  const softwareJob = jobs.find((job) => job.sector === 'software');
  assert.ok(softwareJob, 'Expected an actual software record');
  await publicPage.getByTestId('select-scenario-category').selectOption(softwareJob.sector);
  await publicPage.getByTestId('select-scenario-job').selectOption(softwareJob.id);
  await publicPage.getByTestId(`card-scenario-role-${slug(softwareJob.id)}`).waitFor();

  await check('selected record displays its original title, company, requirements, experience and source URL', async () => {
    assert.equal(await publicPage.locator('#sp-role-title').innerText(), softwareJob.title);
    assert.equal(await publicPage.getByTestId('text-scenario-role-company').innerText(), softwareJob.company);
    assert.equal(await publicPage.getByTestId('text-scenario-role-experience').innerText(), softwareJob.experience);
    assert.equal(await publicPage.getByTestId('text-scenario-role-technical').innerText(), softwareJob.technicalSkills.join(' · '));
    assert.equal(await publicPage.getByTestId('text-scenario-role-soft').innerText(), softwareJob.softSkills.join(' · '));
    assert.equal(await publicPage.getByTestId('link-scenario-role-source').getAttribute('href'), softwareJob.sourceUrl);
    assert.match(await publicPage.getByTestId('card-scenario-moderate').innerText(), /Illustrative planning examples only/);
  });

  await publicPage.getByTestId('select-scenario-category').selectOption('mechanical');
  await check('category changes update illustrative prompts without implying verified job duties', async () => {
    assert.equal(await publicPage.getByTestId('select-scenario-job').inputValue(), '');
    assert.match(await publicPage.getByTestId('card-scenario-moderate').innerText(), /Illustrative task prompt · Mechanical/);
    assert.match(await publicPage.getByTestId('card-scenario-moderate').innerText(), /not verified daily duties/);
    assert.equal(publicMatcherRequests.length, 0);
  });
  await publicContext.close();

  const privateContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await privateContext.addInitScript(({ value, key }) => localStorage.setItem(key, JSON.stringify(value)), { value: profile, key: profileKey });
  const privatePage = await privateContext.newPage();
  privatePage.on('pageerror', (error) => errors.push(error.message));
  const submittedPayloads = [];
  privatePage.on('request', (request) => {
    if (request.url().endsWith('/api/future-ready/role-matches')) {
      submittedPayloads.push(request.postDataJSON());
    }
  });

  const matchResponse = await privatePage.request.post(`${baseURL}/api/future-ready/role-matches`, {
    data: { currentSkills: ['Python'] },
  });
  assert.equal(matchResponse.status(), 200);
  assert.match(matchResponse.headers()['content-type'] || '', /application\/json/i);
  const matches = await matchResponse.json();
  const selectedMatch = matches.results.find((role) =>
    role.skillGaps.some((gap) =>
      buildResourceRecommendations([gap.skill]).some(({ resource }) => resource.kind === 'course'),
    ),
  );
  assert.ok(selectedMatch, 'Expected a real role gap that maps to an existing Feature 3 course');
  const savedBefore = JSON.stringify(profile);

  await privatePage.goto(`${baseURL}/scenario-planning`);
  await privatePage.getByTestId('button-build-scenario-plan').waitFor();
  await privatePage.getByTestId('select-scenario-category').selectOption(selectedMatch.job.sector);
  await privatePage.getByTestId('select-scenario-job').selectOption(selectedMatch.job.id);
  await privatePage.getByTestId('button-build-scenario-plan').waitFor();
  assert.equal(submittedPayloads.length, 0, 'Selecting a role must not submit profile skills automatically');
  await privatePage.getByTestId('button-build-scenario-plan').click();
  await privatePage.getByTestId('section-scenario-plan-results').waitFor();

  await check('personal plan sends only explicitly saved skill names and treats gaps as profile-relative', async () => {
    assert.deepEqual(submittedPayloads, [{ currentSkills: ['Python'] }]);
    assert.equal(await privatePage.locator('#sp-role-title').innerText(), selectedMatch.job.title);
    assert.equal(await privatePage.getByTestId('text-scenario-role-technical').innerText(), selectedMatch.job.technicalSkills.join(' · '));
    for (const gap of selectedMatch.skillGaps) {
      assert.match(await privatePage.getByTestId(`text-scenario-gap-${slug(gap.skill)}`).innerText(), /not found in saved profile/);
    }
    const matchingCourse = buildResourceRecommendations(selectedMatch.skillGaps.map((gap) => gap.skill))
      .find(({ resource }) => resource.kind === 'course');
    assert.ok(matchingCourse);
    await privatePage.getByTestId(`card-scenario-resource-${slug(matchingCourse.resource.id)}`).waitFor();
    assert.match(await privatePage.getByTestId('section-scenario-plan-results').innerText(), /SELF-REPORTED SAVED SKILLS/);
    assert.equal(await privatePage.evaluate((key) => localStorage.getItem(key), profileKey), savedBefore);
    assert.equal(await privatePage.evaluate(() => localStorage.getItem('futurenow.skills-profile.v1')?.includes('This private note must not be sent')), true);
  });

  await privatePage.setViewportSize({ width: 390, height: 844 });
  await check('mobile layout has no horizontal overflow', async () => {
    const layout = await privatePage.evaluate(() => ({ viewport: window.innerWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(layout.scroll <= layout.viewport, `Horizontal overflow: ${JSON.stringify(layout)}`);
  });
  assert.deepEqual(errors, []);
  console.log('PASS: no uncaught browser errors');
  await privateContext.close();
} finally {
  await browser.close();
}
