import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:80';
const profileKey = 'futurenow.skills-profile.v1';
const profile = {
  version: 1,
  profile: {
    basic: {
      status: 'Fresh Graduate',
      field: 'Data analytics',
      years: 0,
      relevantYears: 0,
      education: 'Bachelor’s degree',
      direction: 'Data analysis',
    },
    skills: [
      'SQL', 'Power BI', 'Databases', 'Data Pipelines',
      'Communication', 'Project Management', 'Teamwork', 'Mentoring',
    ].map((name, index) => ({
      id: `test-skill-${index + 1}`,
      name,
      category: 'Technical Skills',
      proficiency: 'Intermediate',
      custom: true,
    })),
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
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
let requestBody;
page.on('request', (request) => {
  if (request.url().includes('/api/future-ready/role-matches')) {
    requestBody = JSON.parse(request.postData() ?? '{}');
  }
});

try {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: profileKey,
    value: savedProfile,
  });
  await page.goto(`${baseURL}/future-role-matching`);
  await page.getByTestId('text-privacy-disclosure').waitFor();

  const responsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/future-ready/role-matches') && response.status() === 200,
  );
  await page.getByTestId('button-generate-matches').click();
  const response = await responsePromise;
  const payload = await response.json();
  await page.getByTestId('card-match-J45').waitFor();

  const methodDetails = page.getByTestId('details-matching-method');
  assert.equal(await methodDetails.getAttribute('open'), null);
  const methodSummary = methodDetails.locator(':scope > summary');
  const summaryText = await methodSummary.innerText();
  for (const phrase of [
    'Skills:', 'Experience and education:', 'Ranking:',
    'Results are estimates based on available information',
    'A skill not found in your profile is not proof that you lack it.',
  ]) assert.ok(summaryText.includes(phrase), `Missing concise methodology text: ${phrase}`);
  await methodSummary.click();
  const scoringDetails = page.getByTestId('details-scoring-details');
  await scoringDetails.locator('summary').click();
  const scoringText = await scoringDetails.innerText();
  for (const phrase of ['40%', '30%', '12.5%', 'proportionally redistributed', 'Tier 1', 'Tier 2', 'Tier 3']) {
    assert.ok(scoringText.includes(phrase), `Missing scoring detail: ${phrase}`);
  }

  assert.equal(payload.totalJobs, 50);
  assert.equal(requestBody.relevantExperienceYears, 0);
  assert.equal('experienceYears' in requestBody, false);
  assert.equal(requestBody.educationLevel, 'Bachelor’s degree');
  assert.equal(requestBody.currentSkills.length, 8);
  assert.equal(payload.results.find((row) => row.job.id === 'J47').skillCoverage, 100);
  assert.equal(payload.results.find((row) => row.job.id === 'J47').compatibilityTier, 3);
  assert.equal(payload.results.find((row) => row.job.id === 'J45').compatibilityTier, 2);
  for (const row of payload.results.filter((result) => result.compatibilityTier === 1)) {
    assert.ok(row.skillCoverage >= 50);
    assert.ok(row.technicalCoverage === null || row.technicalCoverage >= 50);
  }
  for (const row of payload.results) {
    if (row.overallScore !== null) {
      const totalContribution = row.scoreBreakdown.reduce((sum, item) => sum + (item.contribution ?? 0), 0);
      assert.ok(Math.abs(totalContribution - row.overallScore) < 0.001, `score breakdown must reconcile for ${row.job.id}`);
    }
  }
  assert.ok(
    payload.results.findIndex((row) => row.job.id === 'J45')
      < payload.results.findIndex((row) => row.job.id === 'J47'),
    'the internship should rank before the higher-skill-coverage senior job',
  );
  const rankingSnapshot = payload.results.map((row) => ({
    id: row.job.id,
    skillCoverage: row.skillCoverage,
    overallScore: row.overallScore,
    compatibilityTier: row.compatibilityTier,
    compatibilityReasons: row.compatibilityReasons,
    experienceSummary: row.experienceFit.summary,
    educationSummary: row.educationFit.summary,
  }));
  assert.equal(
    await page.evaluate((key) => localStorage.getItem(key), profileKey),
    savedProfile,
    'matching must not change the locally saved profile',
  );

  await page.getByTestId('select-match-category').selectOption('data-analytics');
  await page.getByTestId('button-view-details-J43').click();
  await page.getByTestId('text-detail-title').waitFor();
  assert.equal(await page.getByTestId('section-sdg-connections').count(), 0);
  assert.equal(await page.getByText('SDG review needed', { exact: false }).count(), 0);
  assert.equal(await page.getByText('Not assessed', { exact: false }).count(), 0);

  await page.getByTestId('button-back-to-results').click();
  await page.getByTestId('button-view-details-J45').click();
  await page.getByTestId('section-sdg-connections').waitFor();
  assert.equal(await page.getByTestId('details-score-breakdown').getAttribute('open'), null);
  assert.equal(await page.getByTestId('details-matched-skills').getAttribute('open'), null);
  assert.equal(await page.getByTestId('details-missing-skills').getAttribute('open'), null);
  assert.equal(await page.getByTestId('section-original-job-information').getAttribute('open'), null);
  await page.getByTestId('details-score-breakdown').locator('summary').click();
  assert.equal(await page.getByTestId('details-score-breakdown').locator('tbody tr').count(), 7);
  await page.getByTestId('section-original-job-information').locator('summary').click();
  assert.equal(await page.getByTestId('text-detail-experience-source').innerText(), 'Internship');
  assert.equal(await page.getByTestId('text-detail-score').innerText(), `${payload.results.find((row) => row.job.id === 'J45').overallScore}%`);
  assert.match(await page.getByTestId('text-detail-coverage').innerText(), /1 \/ 7 \(14\.3%\)/);
  const sdgIds = await page.getByTestId('section-sdg-connections').locator('[data-testid^="sdg-goal-"]').evaluateAll(elements => elements.map(el => el.getAttribute('data-testid')));
  assert.equal(new Set(sdgIds).size, sdgIds.length, 'each SDG goal is consolidated once per role');

  await page.reload();
  await page.getByTestId('text-privacy-disclosure').waitFor();
  const refreshResponsePromise = page.waitForResponse((nextResponse) =>
    nextResponse.url().includes('/api/future-ready/role-matches') && nextResponse.status() === 200,
  );
  await page.getByTestId('button-generate-matches').click();
  const refreshedPayload = await (await refreshResponsePromise).json();
  assert.deepEqual(refreshedPayload.results.map((row) => ({
    id: row.job.id,
    skillCoverage: row.skillCoverage,
    overallScore: row.overallScore,
    compatibilityTier: row.compatibilityTier,
    compatibilityReasons: row.compatibilityReasons,
    experienceSummary: row.experienceFit.summary,
    educationSummary: row.educationFit.summary,
  })), rankingSnapshot);

  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log('PASS: real 50-record matching, career-stage order, score separation, profile preservation, conditional SDGs, and mobile layout');
} finally {
  await context.close();
  await browser.close();
}
