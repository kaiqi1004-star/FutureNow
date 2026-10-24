import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});
const baseURL = (process.env.TEST_BASE_URL || 'http://127.0.0.1:80').replace(/\/$/, '');
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

try {
  await page.goto(`${baseURL}/jobs`);
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  assert.equal(await page.getByTestId('button-language-EN').getAttribute('aria-pressed'), 'true');
  await page.locator('.job-card').first().waitFor();
  const firstRecord = page.locator('.job-card').first();
  const originalTitle = await firstRecord.locator('h3').innerText();
  const originalCompany = await firstRecord.locator('.job-company').innerText();

  await page.getByTestId('button-language-BM').click();
  await page.waitForFunction(() => document.documentElement.lang === 'ms');
  await page.waitForFunction(() => localStorage.getItem('futurenow.language.v1') === 'BM');
  assert.equal(await page.getByTestId('button-language-BM').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.getByTestId('link-nav-overview').innerText(), 'Ringkasan');
  assert.equal(await firstRecord.locator('h3').innerText(), originalTitle);
  assert.equal(await firstRecord.locator('.job-company').innerText(), originalCompany);

  await page.goto(`${baseURL}/`);
  assert.equal(await page.getByTestId('link-nav-overview').innerText(), 'Ringkasan');
  await page.goto(`${baseURL}/jobs`);
  await page.locator('.breadcrumb strong').waitFor();
  assert.equal(await page.locator('.breadcrumb strong').innerText(), 'Peneroka Rekod Pekerjaan');
  assert.equal(await page.locator('html').getAttribute('lang'), 'ms');
  await page.reload();
  assert.equal(await page.getByTestId('button-language-BM').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.getByTestId('link-nav-overview').innerText(), 'Ringkasan');

  await page.getByTestId('button-language-CN').click();
  await page.waitForFunction(() => document.documentElement.lang === 'zh-CN');
  await page.waitForFunction(() => localStorage.getItem('futurenow.language.v1') === 'CN');
  assert.equal(await page.locator('.breadcrumb strong').innerText(), '职位记录浏览器');
  assert.equal(await page.getByTestId('link-nav-overview').innerText(), '概览');
  assert.equal(await firstRecord.locator('h3').innerText(), originalTitle);
  assert.equal(await firstRecord.locator('.job-company').innerText(), originalCompany);
  await page.goto(`${baseURL}/scenario-planning`);
  await page.waitForFunction(() => document.querySelector('.breadcrumb strong')?.textContent?.trim() === '情景规划');
  assert.equal(await page.locator('.breadcrumb strong').innerText(), '情景规划');
  await page.reload();
  assert.equal(await page.getByTestId('button-language-CN').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');

  assert.deepEqual(errors, []);
  console.log('PASS: BM/CN switching, route propagation, reload persistence and no browser errors');
} finally {
  await context.close();
  await browser.close();
}
