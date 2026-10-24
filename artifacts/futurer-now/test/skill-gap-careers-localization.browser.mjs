import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});
const baseURL = (process.env.TEST_BASE_URL || 'http://127.0.0.1:80').replace(/\/$/, '');
const jobs = [
  { id: 'J1', sector: 'software', skill: 'Laravel', count: 12 },
  { id: 'J13', sector: 'mechanical', skill: 'AGV research and product development', count: 12 },
  { id: 'J43', sector: 'data-analytics', skill: 'Excel', count: 8 },
  { id: 'J37', sector: 'accounting-finance', skill: 'General Ledger (GL)', count: 6 },
  { id: 'J25', sector: 'digital-marketing', skill: 'Meta Ads', count: 6 },
  { id: 'J31', sector: 'human-resources', skill: 'Recruitment', count: 6 },
];
const languages = [
  { code: 'EN', html: 'en' },
  { code: 'BM', html: 'ms' },
  { code: 'CN', html: 'zh-CN' },
];
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(10_000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
});

try {
  const response = await page.request.get(`${baseURL}/api/future-ready/jobs`);
  assert.equal(response.status(), 200);
  const records = await response.json();
  assert.equal(records.length, 50);
  const counts = records.reduce((result, record) => {
    result[record.sector] = (result[record.sector] ?? 0) + 1;
    return result;
  }, {});
  assert.deepEqual(counts, {
    software: 12,
    mechanical: 12,
    'data-analytics': 8,
    'accounting-finance': 6,
    'digital-marketing': 6,
    'human-resources': 6,
  });

  await page.goto(`${baseURL}/skill-gap`);
  await page.getByTestId('step-choose-goal').waitFor();
  await page.getByTestId('select-skill-gap-job').locator('option[value="J1"]').waitFor({ state: 'attached' });
  const initialSelect = page.getByTestId('select-skill-gap-job');
  assert.equal(await initialSelect.locator('option').count(), 51);

  // Search the real all-category list and confirm filtering the menu works.
  await page.getByTestId('input-skill-job-filter').fill('Mecar');
  assert.equal(await initialSelect.locator('option').count(), 2);
  assert.match(await initialSelect.locator('option').nth(1).innerText(), /Record J1/);
  await page.getByTestId('input-skill-job-filter').clear();

  for (const language of languages) {
    for (const job of jobs) {
      // Keep each comparison independent; prior language runs may save a practice choice.
      await page.goto(`${baseURL}/skill-gap`);
      await page.evaluate(id => localStorage.removeItem(`futurenow-skill-gap-completed:${id}`), job.id);
      await page.reload();
      await page.getByTestId('step-choose-goal').waitFor();
      await page.getByTestId(`button-language-${language.code}`).click();
      await page.waitForFunction(expected => document.documentElement.lang === expected, language.html);
      await page.getByTestId(`button-sector-${job.sector}`).click();
      const select = page.getByTestId('select-skill-gap-job');
      await select.locator(`option[value="${job.id}"]`).waitFor({ state: 'attached' });
      assert.equal(await select.locator('option').count(), job.count + 1);
      await select.selectOption(job.id);
      assert.equal(await page.getByTestId('button-next-assess').isEnabled(), true);
      await page.getByTestId('button-next-assess').click();
      await page.getByTestId('textarea-current-skills').fill(job.skill);
      await page.getByTestId('button-analyze-skills').click();
      await page.getByTestId('step-review-gaps').waitFor();

      const coverage = await page.getByTestId('text-coverage-percent').innerText();
      assert.match(coverage, /\d+(?:\.\d+)?%/);
      assert.equal(await page.getByTestId('selected-goal-context').getByText(job.id).count(), 1);

      const profileGroup = page.getByTestId('assessment-group-in-profile');
      const matchedPracticeButton = profileGroup.getByRole('button').first();
      await matchedPracticeButton.waitFor({ state: 'visible' });
      assert.ok(await profileGroup.getByRole('button').count() > 0, `${job.id}/${language.code} should match the supplied skill`);
      await matchedPracticeButton.click();
      const practiceGroup = page.getByTestId('assessment-group-practice');
      await practiceGroup.getByRole('button').first().waitFor({ state: 'visible' });
      assert.ok((await practiceGroup.innerText()).length > 0);
      await page.getByTestId('button-build-roadmap').click();
      const roadmap = page.getByTestId('step-build-roadmap');
      await roadmap.waitFor();
      assert.ok(await page.locator('[data-testid^="roadmap-step-"]').count() > 0);
      await page.getByTestId('select-roadmap-progress-1').selectOption('in-progress');
      assert.equal(await page.getByTestId('select-roadmap-progress-1').inputValue(), 'in-progress');

      // Visible labels and guidance must not fall back to English in BM/CN.
      const roadmapHeading = await roadmap.locator('h2').first().innerText();
      const firstStep = await page.getByTestId('roadmap-step-1').innerText();
      if (language.code !== 'EN') {
        assert.notEqual(roadmapHeading, 'Build at your own pace');
        for (const englishLabel of ['Try this:', 'Duration', 'Access', 'Not stated', 'Not verified']) {
          assert.ok(!firstStep.includes(englishLabel), `${job.id}/${language.code} leaked ${englishLabel}`);
        }
      }

      console.log(`PASS ${job.id} ${language.code}: ${coverage}; roadmap step 1=${await page.getByTestId('roadmap-step-1').locator('h3').innerText()}`);
    }
  }

  assert.deepEqual(errors, []);
  console.log('PASS: 18 category/language comparisons and roadmaps; API/category counts, real listing search, practice selection, progress change, and no browser errors.');
} finally {
  await context.close();
  await browser.close();
}
