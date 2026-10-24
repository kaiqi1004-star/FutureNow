import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});
const baseURL = (process.env.TEST_BASE_URL || 'http://127.0.0.1:80').replace(/\/$/, '');
const profileKey = 'futurenow.skills-profile.v1';
const planKey = 'futurenow-skill-gap-completed:J1';
const profile = {
  version: 1,
  profile: {
    basic: {
      status: 'Fresh Graduate',
      field: 'Software development',
      years: 0,
      relevantYears: 0,
      education: 'Bachelor’s degree',
      direction: 'Software development',
    },
    skills: [{
      id: 'skill-gap-browser-test',
      name: 'Laravel',
      category: 'Technical Skills',
      proficiency: 'Intermediate',
      custom: true,
    }],
    experience: {
      academic: '', work: '', personal: '', examples: '',
      certifications: '', achievements: '', skipped: false,
    },
    interests: {
      industries: [], activities: [], priorities: [],
      willingness: '', weeklyHours: '', budget: '',
    },
    readiness: {
      technology: '', problemApproach: '', adaptability: '', realisticHours: '',
    },
  },
  step: 4,
  submitted: true,
  savedAt: '2026-10-24T00:00:00.000Z',
};
const savedProfile = JSON.stringify(profile);
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
const analysisRequests = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('request', (request) => {
  if (request.url().includes('/api/future-ready/skill-gap') && request.method() === 'POST') {
    analysisRequests.push(JSON.parse(request.postData() ?? '{}'));
  }
});

async function prepareComparison() {
  await page.getByTestId('step-choose-goal').waitFor();
  await page.getByTestId('select-skill-gap-job').selectOption('J1');
  await page.getByTestId('button-next-assess').click();
  await page.getByTestId('button-use-my-profile').click();
  await page.getByTestId('status-profile-read').waitFor();
  assert.match(await page.locator('#current-skills').inputValue(), /Laravel/);
  assert.equal(await page.getByTestId('input-relevant-years').inputValue(), '0');
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), profileKey), savedProfile);
}

async function compare() {
  await page.getByTestId('button-analyze-skills').click();
  await page.getByTestId('text-requirement-count').waitFor();
}

try {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: profileKey,
    value: savedProfile,
  });
  await page.goto(`${baseURL}/skill-gap`);
  await page.getByTestId('step-choose-goal').waitFor();

  assert.equal(await page.locator('#goal-title').innerText(), 'Choose a career goal');
  await page.getByTestId('button-language-BM').click();
  await page.waitForFunction(() => document.documentElement.lang === 'ms');
  assert.equal(await page.locator('#goal-title').innerText(), 'Pilih matlamat kerjaya');
  await page.getByTestId('button-language-CN').click();
  await page.waitForFunction(() => document.documentElement.lang === 'zh-CN');
  assert.equal(await page.locator('#goal-title').innerText(), '选择职业目标');
  await page.getByTestId('button-language-EN').click();
  await page.waitForFunction(() => document.documentElement.lang === 'en');

  await prepareComparison();
  await compare();
  const firstCoverage = await page.getByTestId('text-coverage-formula').innerText();
  assert.match(await page.getByTestId('text-requirement-count').innerText(), /1 matched \/ \d+ total/);
  assert.match(await page.getByTestId('experience-context').innerText(), /Cannot compare/);
  assert.equal(await page.getByTestId('assessment-group-in-profile').getByText('Laravel', { exact: true }).count(), 1);

  const evidence = page.getByTestId('listing-evidence');
  await evidence.locator('summary').click();
  assert.match(await evidence.innerText(), /Bachelor's & Equivalent/);
  assert.match(await evidence.innerText(), /RM 2500/);
  assert.equal(await page.getByTestId('link-evidence-source').getAttribute('href'), 'https://candidates.myfuturejobs.gov.my/search-jobs?jobId=1b51f73e17334f559df77acbb9d14485');

  await page.getByTestId('button-practice-technical-laravel').click();
  assert.equal(await page.getByTestId('assessment-group-practice').getByText('Laravel', { exact: true }).count(), 1);
  await page.getByTestId('button-build-roadmap').click();
  await page.getByTestId('step-build-roadmap').waitFor();
  assert.equal(analysisRequests.length, 2);
  assert.deepEqual(analysisRequests[0].currentSkills, ['Laravel']);
  assert.equal('relevantYears' in analysisRequests[0], false);
  assert.deepEqual(analysisRequests[1].practiceSkills, ['Laravel']);
  assert.equal('profile' in analysisRequests[1], false);
  assert.equal(await page.getByTestId('roadmap-results').getByRole('heading', { name: 'Laravel', exact: true }).count(), 1);
  assert.match(await page.getByTestId('step-build-roadmap').innerText(), /Try this:/);
  await page.getByTestId('button-back-review').click();
  assert.equal(await page.getByTestId('text-coverage-formula').innerText(), firstCoverage);
  await page.getByTestId('button-build-roadmap').click();
  await page.getByTestId('step-build-roadmap').waitFor();

  const firstTask = page.getByTestId('roadmap-step-1');
  await firstTask.getByTestId('select-roadmap-progress-1').selectOption('in-progress');
  const firstTaskSkill = await firstTask.locator('h3').innerText();
  await page.reload();
  await prepareComparison();
  await compare();
  assert.equal(await page.getByTestId('button-practice-technical-laravel').innerText(), 'Undo practice');
  await page.getByTestId('button-build-roadmap').click();
  await page.getByTestId('step-build-roadmap').waitFor();
  assert.equal(await page.getByTestId('roadmap-step-1').locator('h3').innerText(), firstTaskSkill);
  assert.equal(await page.getByTestId('select-roadmap-progress-1').inputValue(), 'in-progress');
  assert.equal(await page.evaluate((key) => localStorage.getItem(key) !== null, planKey), true);
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), profileKey), savedProfile);
  assert.deepEqual(errors, []);
  console.log('PASS: profile reuse stays local, experience is separate, source evidence is visible, roadmap practice and progress persist, EN/BM/CN render');
} finally {
  await context.close();
  await browser.close();
}
