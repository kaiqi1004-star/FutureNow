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
  assert.equal(await page.getByRole('heading', { name: 'Which supplied roles fit your skills?' }).count(), 1);
  assert.equal(await page.getByTestId('text-score-coverage-definition').count(), 1);

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

  const openRoleCard = async (role) => {
    const inCategory = payload.results.filter((result) => result.job.sector === role.job.sector);
    const index = inCategory.findIndex((result) => result.job.id === role.job.id);
    assert.ok(index >= 0, `role ${role.job.id} should remain in its category results`);
    await page.getByTestId('select-match-category').selectOption(role.job.sector);
    for (let pageIndex = 0; pageIndex < Math.floor(index / 6); pageIndex++) {
      await page.getByTestId('button-matches-next').click();
    }
    const card = page.getByTestId(`card-match-${role.job.id}`);
    await card.waitFor();
    return card;
  };
  const noTechnicalRole = payload.results.find((role) => role.requiredCount > 0 && role.requiredTechnicalCount === 0);
  const technicalRole = payload.results.find((role) => role.requiredTechnicalCount > 0);
  assert.ok(noTechnicalRole, 'dataset should include a role with other requirements but no technical requirements');
  assert.ok(technicalRole, 'dataset should include a role with technical requirements');
  for (const [role, expectedTechnicalLabel] of [
    [noTechnicalRole, 'No technical requirements listed'],
    [technicalRole, null],
  ]) {
    const card = await openRoleCard(role);
    const cardText = await card.innerText();
    if (role.job.source.trim()) {
      assert.ok(cardText.includes(`Source platform: ${role.job.source}`), `card should use the actual source platform for ${role.job.id}`);
    } else {
      assert.ok(!cardText.includes('Source platform:'), `missing source platform row should be omitted for ${role.job.id}`);
    }
    const rawUrl = role.job.sourceUrl?.trim();
    let expectedUrl = null;
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') expectedUrl = rawUrl;
    } catch {}
    const sourceLink = card.getByTestId(`link-match-source-${role.job.id}`);
    assert.equal(await sourceLink.count(), expectedUrl ? 1 : 0, `only a valid original URL should link for ${role.job.id}`);
    if (expectedUrl) assert.equal(await sourceLink.getAttribute('href'), expectedUrl);
    await card.getByTestId(`button-view-details-${role.job.id}`).click();
    await page.getByTestId(`detail-match-${role.job.id}`).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'Which supplied roles fit your skills?' }).count(), 0, 'detail must not repeat the page introduction');
    assert.equal(await page.getByTestId('text-privacy-disclosure').count(), 0, 'detail must not repeat the full privacy introduction');
    const companyLine = await page.getByTestId('text-detail-company').innerText();
    assert.equal(companyLine.includes('Source platform:'), Boolean(role.job.source.trim()));
    const technicalLabel = await page.getByTestId('text-detail-technical-coverage').innerText();
    if (expectedTechnicalLabel) assert.equal(technicalLabel, expectedTechnicalLabel);
    else assert.match(technicalLabel, /^\d+ \/ \d+ \(\d+(\.\d+)?%\)$/);
    const detailLink = page.getByTestId('link-detail-source');
    assert.equal(await detailLink.count(), expectedUrl ? 1 : 0);
    if (expectedUrl) assert.equal(await detailLink.getAttribute('href'), expectedUrl);
    await page.getByTestId('section-original-job-information').locator('summary').click();
    const originalDetails = await page.getByTestId('section-original-job-information').innerText();
    assert.equal(originalDetails.includes('Source platform'), Boolean(role.job.source.trim()));
    await page.getByTestId('button-back-to-results').click();
  }
  const noSkillRequirementsRole = payload.results.find((role) => role.requiredCount === 0);
  if (noSkillRequirementsRole) {
    const card = await openRoleCard(noSkillRequirementsRole);
    assert.ok((await card.innerText()).includes('Not available in this listing'));
  }

  await page.getByTestId('select-match-category').selectOption('all');
  await page.getByTestId('select-match-category').selectOption('data-analytics');
  await page.getByTestId('button-view-details-J43').click();
  await page.getByTestId('text-detail-title').waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Which supplied roles fit your skills?' }).count(), 0);
  assert.equal(await page.getByTestId('section-sdg-connections').count(), 0);
  assert.equal(await page.getByText('SDG review needed', { exact: false }).count(), 0);
  assert.equal(await page.getByText('Not assessed', { exact: false }).count(), 0);

  await page.getByTestId('button-back-to-results').click();
  await page.getByTestId('button-view-details-J45').click();
  await page.getByTestId('section-sdg-connections').waitFor();
  assert.equal(await page.getByTestId('details-matched-skills').getAttribute('open'), null);
  assert.equal(await page.getByTestId('details-missing-skills').getAttribute('open'), null);
  assert.equal(await page.getByTestId('section-original-job-information').getAttribute('open'), null);
  const breakdown = page.getByTestId('section-score-breakdown');
  assert.ok(await breakdown.isVisible(), 'category coverage visualization is visible by default');
  assert.equal(await breakdown.locator('table').count(), 0, 'the technical score table is removed');
  assert.equal(await page.getByTestId('text-breakdown-overall').innerText(), `${payload.results.find((row) => row.job.id === 'J45').overallScore}%`);
  for (const item of payload.results.find((row) => row.job.id === 'J45').scoreBreakdown) {
    const isSkillCategory = ['industry-specific', 'technical', 'digital', 'soft'].includes(item.category);
    const row = page.getByTestId(`coverage-row-${item.category}`);
    assert.equal(await row.count(), isSkillCategory && item.status === 'scored' ? 1 : 0, `only applicable skill categories appear: ${item.category}`);
    if (isSkillCategory && item.status === 'scored') {
      assert.ok((await row.innerText()).includes(`${item.matchedCount} / ${item.requiredCount} matched requirements · ${item.coverage}%`));
      assert.equal(Number(await row.locator('[role="progressbar"]').getAttribute('aria-valuenow')), item.coverage);
    }
  }
  assert.equal(await page.getByTestId('row-experience-score').count(), 0, 'unscorable preferred experience is omitted from score dimensions');
  await page.getByTestId('details-matched-skills').locator('summary').click();
  const matchedDetailsText = await page.getByTestId('details-matched-skills').innerText();
  assert.ok(!/Exact name match|Matched by your|Matched by name|Configured equivalent name/.test(matchedDetailsText), 'internal matching provenance must not appear in role details');
  await page.getByTestId('section-original-job-information').locator('summary').click();
  assert.equal(await page.getByTestId('text-detail-experience-source').innerText(), 'Internship');
  assert.ok(await page.getByTestId('section-experience-assessment').isVisible());
  assert.ok(await page.getByTestId('section-education-assessment').isVisible());
  if (payload.results.find((row) => row.job.id === 'J45').job.sourceUrl) {
    assert.equal(await page.getByTestId('link-detail-source').getAttribute('href'), payload.results.find((row) => row.job.id === 'J45').job.sourceUrl);
  }
  const order = await page.getByTestId('detail-match-J45').evaluate((root) => {
    const selectors = [
      '[data-testid="button-back-to-results"]',
      '[data-testid="text-detail-title"]',
      '[data-testid="text-detail-score"]',
      '[data-testid="list-matched-skill-preview"]',
      '[data-testid="list-skill-gaps-preview"]',
      '[data-testid="section-experience-assessment"]',
      '[data-testid="section-original-job-information"]',
      '[data-testid="section-score-breakdown"]',
      '[data-testid="section-sdg-connections"]',
      '[data-testid="section-next-steps"]',
    ];
    return selectors.map((selector) => {
      const element = root.querySelector(selector);
      return element ? [...root.querySelectorAll('*')].indexOf(element) : -1;
    });
  });
  assert.ok(order.every((position) => position >= 0), `expected all role detail sections in the hierarchy: ${order}`);
  assert.ok(order.every((position, index) => index === 0 || position > order[index - 1]), `role detail sections should appear in the requested order: ${order}`);
  assert.equal(await page.getByTestId('text-detail-score').innerText(), `${payload.results.find((row) => row.job.id === 'J45').overallScore}%`);
  assert.match(await page.getByTestId('text-detail-coverage').innerText(), /1 \/ 7 \(14\.3%\)/);
  const sdgIds = await page.getByTestId('section-sdg-connections').locator('[data-testid^="sdg-goal-"]').evaluateAll(elements => elements.map(el => el.getAttribute('data-testid')));
  assert.equal(new Set(sdgIds).size, sdgIds.length, 'each SDG goal is consolidated once per role');

  await page.route('**/api/future-ready/role-matches', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    const roleWithoutUrl = body.results.find((row) => row.job.id === 'J43');
    const roleWithInvalidUrl = body.results.find((row) => row.job.id === 'J44');
    assert.ok(roleWithoutUrl, 'J43 should remain available for the missing-link case');
    assert.ok(roleWithInvalidUrl, 'J44 should remain available for the invalid-link case');
    roleWithoutUrl.job.sourceUrl = null;
    roleWithInvalidUrl.job.sourceUrl = 'javascript:alert(1)';
    await route.fulfill({ response, body: JSON.stringify(body) });
  });
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
  const noSourceUrlRole = refreshedPayload.results.find((row) => row.job.id === 'J43');
  assert.equal(noSourceUrlRole.job.sourceUrl, null);
  const noSourceUrlCard = await openRoleCard(payload.results.find((row) => row.job.id === 'J43'));
  assert.ok(!(await noSourceUrlCard.innerText()).includes('Source platform:'), 'missing platform metadata should be omitted');
  assert.equal(await noSourceUrlCard.getByTestId('link-match-source-J43').count(), 0, 'missing original URL must not produce a card link');
  await noSourceUrlCard.getByTestId('button-view-details-J43').click();
  assert.equal(await page.getByTestId('link-detail-source').count(), 0, 'missing original URL must not produce a detail link');
  await page.getByTestId('section-original-job-information').locator('summary').click();
  assert.ok(!(await page.getByTestId('section-original-job-information').innerText()).includes('Source platform'), 'missing source and URL should omit the source row entirely');
  await page.getByTestId('button-back-to-results').click();
  const invalidUrlCard = await openRoleCard(payload.results.find((row) => row.job.id === 'J44'));
  assert.equal(await invalidUrlCard.getByTestId('link-match-source-J44').count(), 0, 'an unsafe original URL must not produce a card link');
  await invalidUrlCard.getByTestId('button-view-details-J44').click();
  assert.equal(await page.getByTestId('link-detail-source').count(), 0, 'an unsafe original URL must not produce a detail link');
  await page.getByTestId('section-original-job-information').locator('summary').click();
  const invalidUrlDetails = await page.getByTestId('section-original-job-information').innerText();
  assert.ok(!invalidUrlDetails.includes('Original listing') && !invalidUrlDetails.includes('Source platform'), 'invalid source metadata and URLs should not leave an empty listing row');

  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log('PASS: real 50-record matching, career-stage order, score separation, profile preservation, conditional SDGs, and mobile layout');
} finally {
  await context.close();
  await browser.close();
}
