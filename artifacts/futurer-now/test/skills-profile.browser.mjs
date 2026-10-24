import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium', headless: true, args: ['--no-sandbox'] });
// Use the shared artifact proxy: direct Vite requests cannot reach the API service.
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:80';
const out = new URL('../../../generated-artifacts/skills-profile/', import.meta.url);
await mkdir(out, { recursive: true });
let passed = 0;
const results = [];
async function check(name, fn) {
  await fn(); passed++; results.push(name); console.log(`PASS: ${name}`);
}
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const t = id => page.getByTestId(id);
page.on('dialog', d => d.accept());
try {
  await page.goto(`${baseURL}/skills-profile`);
  await check('Required validation and accessible focus', async () => {
    await t('button-next-section').click();
    await t('error-basic-status').waitFor();
    assert.equal(await page.locator('#basic-status').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'basic-status');
  });
  await t('select-status').selectOption('Student');
  await t('select-education').selectOption('Diploma');
  await t('input-field').fill('Software engineering');
  await t('input-years').fill('0');
  await t('input-relevant-years').fill('1.5');
  assert.match(await t('text-relevant-experience-level').innerText(), /Level 1/);
  await t('input-relevant-years').fill('2');
  assert.match(await t('text-relevant-experience-level').innerText(), /Level 2/);
  await t('input-relevant-years').fill('5');
  assert.match(await t('text-relevant-experience-level').innerText(), /Level 3/);
  await t('input-relevant-years').fill('1.5');
  await t('input-direction').fill('Build accessible software');
  await t('button-next-section').click();
  await check('Skill selection, custom creation, rename, proficiency and removal', async () => {
    const categoryIds = await page.locator('[data-testid^="skill-category-"]').evaluateAll(elements => elements.map(el => el.getAttribute('data-testid')));
    assert.deepEqual(categoryIds, [
      'skill-category-broad-technical-areas',
      'skill-category-technical-skills',
      'skill-category-industry-specific-skills',
      'skill-category-digital-skills',
      'skill-category-soft-skills-languages',
    ]);
    assert.equal(await page.locator('.sp-chip.is-on').count(), 0, 'opening the catalogue must not auto-select skills');
    assert.equal(await t('text-selected-skill-count').locator('strong').innerText(), 'Selected: 0');
    await t('input-search-skills').fill('Python');
    await t('chip-skill-python').waitFor();
    await t('chip-skill-python').click();
    assert.equal(await t('chip-skill-python').getAttribute('aria-pressed'), 'true', 'search results should be selectable');
    assert.equal(await t('text-selected-skill-count').locator('strong').innerText(), 'Selected: 1');
    await t('input-search-skills').fill('');
    await t('button-remove-selected-python').click();
    assert.equal(await t('text-selected-skill-count').locator('strong').innerText(), 'Selected: 0', 'selected skills should be removable from the review area');
    await t('chip-skill-programming').click();
    await page.getByTestId('skill-category-soft-skills-languages').locator(':scope > summary').click();
    await t('chip-skill-communication').click();
    assert.equal(await t('text-selected-skill-count').locator('strong').innerText(), 'Selected: 2');
    await t('input-custom-skill').fill('CNC machining');
    await t('select-custom-skill-category').selectOption('Industry-Specific Skills');
    await t('select-custom-skill-proficiency').selectOption('Advanced');
    await t('button-add-custom-skill').click();
    await page.getByRole('button', { name: 'Rename CNC machining', exact: true }).click();
    await page.getByRole('textbox', { name: 'Rename CNC machining' }).fill('CAD modelling');
    await page.getByRole('button', { name: 'Save skill name', exact: true }).click();
    await page.getByLabel('Proficiency for CAD modelling').selectOption('Expert');
    await t('input-custom-skill').fill('Temporary skill');
    await t('button-add-custom-skill').click();
    await page.locator('.sp-skill-row [aria-label="Remove Temporary skill"]').click();
    assert.equal(await page.getByLabel('Proficiency for CAD modelling').inputValue(), 'Expert');
    assert.equal(await page.getByRole('button', { name: 'Remove Temporary skill', exact: true }).count(), 0);
  });
  await check('Draft persistence, back navigation and progress', async () => {
    await t('button-save-draft').click();
    await t('status-save-banner').filter({ hasText: 'Draft saved' }).waitFor();
    await page.reload();
    assert.equal(await page.getByLabel('Proficiency for CAD modelling').inputValue(), 'Expert');
    await t('button-step-0').click();
    assert.equal(await t('input-field').inputValue(), 'Software engineering');
    await t('button-step-1').click();
    assert.match(await page.locator('.sp-progress').innerText(), /2.*of 5/s);
  });
  await t('button-next-section').click();
  await check('Structured evidence links to a saved skill, persists, and remains optional when skipping', async () => {
    await t('button-add-evidence').click();
    const card = page.locator('.sp-evidence-card').first();
    const cardTestId = await card.getAttribute('data-testid');
    const evidenceId = cardTestId.replace('card-evidence-', '');
    await t(`input-evidence-title-${evidenceId}`).fill('University data project');
    await page.getByLabel('Communication', { exact: true }).check();
    await t(`input-evidence-description-${evidenceId}`).fill('Used Communication while presenting course work.');
    await t(`input-evidence-reference-${evidenceId}`).fill('CERT-2025-1');
    await t('button-save-draft').click();
    await t('status-save-banner').filter({ hasText: 'Draft saved' }).waitFor();
    await page.reload();
    assert.equal(await t(`input-evidence-title-${evidenceId}`).inputValue(), 'University data project');
    assert.equal(await t(`input-evidence-description-${evidenceId}`).inputValue(), 'Used Communication while presenting course work.');
    assert.equal(await card.locator('input[type="checkbox"]:checked').count(), 1);
    await page.locator('.sp-legacy-evidence > summary').click();
    await t('input-experience-academic').fill('Built an accessible class project');
    await t('button-skip-experience').click();
  });
  await t('chip-interests-industries-software-it').click();
  await t('chip-interests-activities-analysing-data').click();
  await t('chip-interests-priorities-social-impact').click();
  await t('radio-interests-willingness-4').check();
  await page.locator('#interests-weeklyHours').fill('5');
  await page.locator('#interests-budget').selectOption('Free only');
  await t('button-next-section').click();
  await t('radio-readiness-technology-4').check();
  await page.locator('#readiness-problemApproach').fill('Break the problem down, research and ask a teammate');
  await t('radio-readiness-adaptability-5').check();
  await page.locator('#readiness-realisticHours').fill('5');
  await check('Submission summary, grounded strengths and missing information', async () => {
    await t('button-save-profile').click();
    await page.locator('.sp-summary').waitFor();
    const summary = await page.locator('.sp-summary').innerText();
     for (const text of ['CAD modelling (Expert)', 'Communication', 'Built an accessible class project', 'University data project', 'Used Communication while presenting course work.', 'CERT-2025-1', 'Source:', '4/5', '5 hours', 'not provided (optional)', 'skipped']) assert.ok(summary.includes(text), `Missing summary text ${text}`);
    assert.ok(!summary.includes('match score'));
  });
  await check('Only linked matched-skill evidence appears on Feature 2; it is not part of the API scoring input', async () => {
    await page.goto(`${baseURL}/future-role-matching`);
    const matchBodies = [];
    page.on('request', request => {
      if (request.method() === 'POST' && request.url().includes('/api/future-ready/role-matches')) matchBodies.push(request.postDataJSON());
    });
    await t('button-generate-matches').click();
    await page.locator('[data-testid^="card-match-"]').first().waitFor();
    const category = page.locator('[data-testid="select-match-category"]');
    await category.selectOption('data-analytics');
    let hasJ43 = false;
    for (let pageNumber = 0; pageNumber < 10; pageNumber++) {
      if (await t('card-match-J43').count()) { hasJ43 = true; break; }
      const next = t('button-matches-next');
      if (await next.isDisabled()) break;
      await next.click();
    }
    assert.ok(hasJ43, 'J43 should remain available in the supplied data');
    await t('button-view-details-J43').click();
    await t('details-matched-skills').locator('summary').click();
    await t('evidence-for-communication').waitFor();
    const linked = await t('evidence-for-communication').innerText();
    assert.match(linked, /University data project/);
    assert.match(linked, /not independently verified/i);
    assert.match(linked, /does not change the suitability score/i);
    assert.deepEqual(Object.keys(matchBodies[0]).sort(), ['currentSkills', 'educationLevel', 'relevantExperienceYears']);
    assert.equal(matchBodies[0].relevantExperienceYears, 1.5);
    assert.equal('experienceYears' in matchBodies[0], false);
  });
  await check('Saved summary refresh, edit and resave', async () => {
    await page.goto(`${baseURL}/skills-profile`);
    await page.locator('.sp-summary').waitFor();
    await t('button-edit-section-0').click();
    await t('input-field').fill('Updated engineering field');
    await t('button-step-4').click();
    await t('button-save-profile').click();
    await page.reload();
    assert.ok((await page.locator('.sp-summary').innerText()).includes('Updated engineering field'));
  });
  const validSaved = await page.evaluate(() => localStorage.getItem('futurenow.skills-profile.v1'));
  await check('Mobile layout and menu', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await t('button-open-navigation').click();
    await t('link-module-future-role-matching').click();
    await t('text-privacy-disclosure').waitFor();
    await page.goto(`${baseURL}/skills-profile`);
    await t('button-open-navigation').click();
    await page.keyboard.press('Escape');
    assert.equal(await t('button-open-navigation').getAttribute('aria-expanded'), 'false');
    await page.screenshot({ path: new URL('mobile-summary.png', out).pathname, fullPage: true });
  });
  await check('Existing routes and active module destinations', async () => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const path of ['/', '/jobs', '/workforce-data', '/skill-gap', '/future-role-matching', '/reskilling-pathway', '/market-intelligence', '/scenario-planning']) {
      await page.goto(`${baseURL}${path}`);
      await page.locator('h1').waitFor();
      if (['/', '/jobs', '/workforce-data', '/skill-gap'].includes(path)) {
        await page.waitForLoadState('networkidle');
      }
      const content = await page.locator('.page-wrap').first().innerText();
      assert.ok(content.length > 100, path);
      assert.doesNotMatch(content, /Coming soon/i);
      assert.equal(await page.getByText('Something went wrong', { exact: false }).count(), 0);
    }
  });
  await check('Dark-mode profile and mobile keyboard navigation', async () => {
    await page.goto(`${baseURL}/skills-profile`);
    await t('button-theme-toggle').click();
    assert.equal(await page.locator('html').evaluate(el => el.classList.contains('dark')), true);
    const bg = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
    assert.notEqual(bg, 'rgb(255, 253, 245)');
    await page.screenshot({ path: new URL('dark-summary.png', out).pathname, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await t('button-open-navigation').click();
    await t('button-close-navigation').focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-testid')), 'link-nav-skill-gap');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-testid')), 'button-close-navigation');
    await page.keyboard.press('Escape');
    await t('button-edit-section-0').click();
    assert.equal(await t('button-step-0').getAttribute('aria-label'), 'Section 1: Basic information');
    assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '5');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await t('button-theme-toggle').click();
  });
  await check('Corrupt storage displays a recovery warning without overwriting data', async () => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(baseURL);
    await p.evaluate(() => localStorage.setItem('futurenow.skills-profile.v1', '{invalid'));
    await p.goto(`${baseURL}/skills-profile`);
    await p.getByTestId('status-save-banner').waitFor();
    assert.match(await p.getByTestId('status-save-banner').innerText(), /could not be read|damaged/);
    assert.equal(await p.evaluate(() => localStorage.getItem('futurenow.skills-profile.v1')), '{invalid');
    await ctx.close();
  });
  await check('Blocked browser storage does not crash app or claim draft saved', async () => {
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => {
      Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
      Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
    });
    const p = await ctx.newPage();
    await p.goto(`${baseURL}/skills-profile`);
    await p.getByTestId('input-field').fill('Keep this answer');
    await p.getByTestId('button-save-draft').click();
    assert.match(await p.getByTestId('status-save-banner').innerText(), /not saved/i);
    assert.equal(await p.getByTestId('input-field').inputValue(), 'Keep this answer');
    assert.equal(await p.locator('.sp-summary').count(), 0);
    await ctx.close();
  });
  await check('Quota failure during final save preserves answers and does not enter summary', async () => {
    const ctx = await browser.newContext();
    await ctx.addInitScript(saved => {
      localStorage.setItem('futurenow.skills-profile.v1', saved);
      Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
    }, validSaved);
    const p = await ctx.newPage();
    await p.goto(`${baseURL}/skills-profile`);
    await p.getByTestId('button-edit-section-0').click();
    await p.getByTestId('input-field').fill('Unsaved quota test');
    await p.getByTestId('button-step-4').click();
    await p.getByTestId('button-save-profile').click();
    assert.match(await p.getByTestId('status-save-banner').innerText(), /not saved/i);
    assert.equal(await p.locator('.sp-summary').count(), 0);
    await p.getByTestId('button-step-0').click();
    assert.equal(await p.getByTestId('input-field').inputValue(), 'Unsaved quota test');
    await ctx.close();
  });
  await page.goto(`${baseURL}/skills-profile`);
  await page.screenshot({ path: new URL('desktop-summary.png', out).pathname, fullPage: true });
  assert.deepEqual(errors, []);
  console.log(`${passed} browser checks passed; no page errors.`, results);
} finally {
  await browser.close();
}
