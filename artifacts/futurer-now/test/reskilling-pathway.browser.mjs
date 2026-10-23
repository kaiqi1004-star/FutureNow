import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { buildResourceRecommendations } from '../src/lib/reskilling-resources.ts';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:80';
const errors = [];
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

const noProfileContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const noProfilePage = await noProfileContext.newPage();
noProfilePage.on('pageerror', (error) => errors.push(error.message));

try {
  await noProfilePage.goto(`${baseURL}/reskilling-pathway`);
  await noProfilePage.getByTestId('status-no-profile').waitFor();
  await check('real job records and explicit no-profile state', async () => {
    await noProfilePage.getByTestId('text-pathway-record-count').waitFor();
    assert.match(await noProfilePage.getByTestId('text-pathway-record-count').innerText(), /50 supplied records/);
    assert.equal(await noProfilePage.getByTestId('select-pathway-category').locator('option').count(), 7);
    assert.equal(await noProfilePage.locator('[data-testid^="card-pathway-provider-"]').count(), 8);
    assert.equal(await noProfilePage.getByTestId('status-no-profile').isVisible(), true);
  });
  await noProfileContext.close();

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript((value) => localStorage.setItem('futurenow.skills-profile.v1', JSON.stringify(value)), profile);
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  let submittedPayload;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/future-ready/role-matches')) {
      submittedPayload = request.postDataJSON();
    }
  });

  const rolesResponse = await page.request.post(`${baseURL}/api/future-ready/role-matches`, {
    data: { currentSkills: ['Python'] },
  });
  assert.equal(rolesResponse.status(), 200);
  const roleResults = await rolesResponse.json();
  const selected = roleResults.results.find((role) =>
    role.skillGaps.some((gap) =>
      buildResourceRecommendations([gap.skill]).some(({ resource }) => resource.kind === 'course'),
    ),
  );
  assert.ok(selected, 'Expected at least one actual job gap to map to a verified learning item');

  await page.goto(`${baseURL}/reskilling-pathway`);
  await page.getByTestId('select-pathway-job').selectOption(selected.job.id);
  await page.getByTestId('button-compare-pathway').click();
  await page.getByTestId('list-pathway-gaps').waitFor();

  await check('comparison sends only explicit saved skill names', async () => {
    assert.deepEqual(submittedPayload, { currentSkills: ['Python'] });
    assert.equal(await page.getByTestId('text-pathway-job-title').innerText(), selected.job.title);
    assert.equal(await page.getByTestId('text-pathway-job-company').innerText().then((value) => value.startsWith(selected.job.company)), true);
    assert.match(await page.getByTestId('text-pathway-weekly-hours').innerText(), /5 hours available per week/);
    assert.match(await page.locator('.pathway-budget-note').innerText(), /Low-cost/);
  });

  const gapNames = selected.skillGaps.map((gap) => gap.skill);
  const mapped = buildResourceRecommendations(gapNames)
    .find(({ resource }) => resource.kind === 'course' && resource.access === 'free');
  assert.ok(mapped, 'The selected job should expose at least one free exact-topic learning resource');
  await page.getByTestId('select-pathway-provider').selectOption(mapped.resource.provider);
  await page.getByTestId('select-pathway-access').selectOption('free');
  await page.getByTestId('select-pathway-skill').selectOption(mapped.skills[0].name);
  await page.getByTestId(`card-learning-resource-${mapped.resource.id}`).waitFor();

  await check('skill, provider and free-access filters preserve a matching resource', async () => {
    const cards = page.locator('.pathway-resource-card');
    assert.ok(await cards.count() > 0);
    assert.equal(await page.getByTestId(`link-learning-resource-${mapped.resource.id}`).getAttribute('href'), mapped.resource.url);
    assert.equal(await page.getByTestId('select-pathway-provider').inputValue(), mapped.resource.provider);
    assert.equal(await page.getByTestId('select-pathway-access').inputValue(), 'free');
    assert.match(await page.getByTestId('text-pathway-resource-count').innerText(), /resource/);
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await check('mobile layout does not overflow horizontally', async () => {
    const layout = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      scrollWidth: [...document.querySelectorAll('body *')].map((element) => ({
        tag: element.tagName,
        id: element.id,
        className: typeof element.className === 'string' ? element.className : '',
        client: element.clientWidth,
        scroll: element.scrollWidth,
      })).filter((element) => element.scroll > element.client + 1).slice(0, 20),
      overflow: [...document.querySelectorAll('body *')].map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          id: element.id,
          className: typeof element.className === 'string' ? element.className : '',
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      }).filter((element) => element.right > window.innerWidth + 1 || element.left < -1).slice(0, 20),
    }));
    if (layout.document > layout.viewport) console.log('Mobile layout inspection:', JSON.stringify(layout));
    assert.ok(layout.document <= layout.viewport);
  });
  assert.deepEqual(errors, []);
  console.log('PASS: no uncaught browser errors');
  await context.close();
} finally {
  await browser.close();
}
