// Captures what the live storefront actually looks like, so the suite's selectors can be tuned
// from a machine that cannot reach the UAT itself.
//
//   node scripts/capture-site.mjs
//
// Writes ./site-snapshot/<page>/{page.html, aria.yml, screenshot.png} plus summary.json.
// Read-only apart from one add-to-cart click on UAT. It never fills checkout, login or
// registration forms, never places an order, and aborts any order/payment request as a guard.
import { chromium } from '@playwright/test';
import * as dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config();

const baseUrl = (process.env.BASE_URL || 'https://tasawoq.uat.aawweb.com').replace(/\/+$/, '');
const searchTerm = process.env.SEARCH_TERM || 'shampoo';
const outDir = path.resolve('site-snapshot');
const httpUser = process.env.HTTP_USERNAME;

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const summary = { baseUrl, capturedAt: new Date().toISOString(), pages: [], errors: [] };

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1366, height: 900 },
  ignoreHTTPSErrors: true,
  httpCredentials: httpUser ? { username: httpUser, password: process.env.HTTP_PASSWORD || '' } : undefined,
});
// Safety net: never let an order or payment go through.
await context.route(/(place-?order|payment-information|\/orders?\b|\/payment|\/checkout\/(submit|complete))/i, (route) =>
  route.request().method() === 'GET' ? route.continue() : route.abort(),
);
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(`${page.url()} :: ${m.text()}`));

const sameOrigin = (href) => {
  try {
    return new URL(href, baseUrl).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
};

async function capture(name, url, { fullPage = true } = {}) {
  const dir = path.join(outDir, name);
  fs.mkdirSync(dir, { recursive: true });
  const entry = { name, requested: url };
  try {
    if (url) {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      entry.status = res?.status();
    }
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    if (name === 'checkout') await page.waitForTimeout(8_000); // knockout renders the shipping form late
    entry.url = page.url();
    entry.title = await page.title();
    entry.lang = await page.locator('html').getAttribute('lang');
    entry.dir = await page.locator('html').getAttribute('dir');
    const html = await page.evaluate(() => {
      const clone = document.documentElement.cloneNode(true);
      clone.querySelectorAll('script, style, noscript, svg path, link[rel="stylesheet"]').forEach((n) => n.remove());
      return '<!doctype html>\n' + clone.outerHTML;
    });
    fs.writeFileSync(path.join(dir, 'page.html'), html);
    const aria = await page.locator('body').ariaSnapshot({ timeout: 20_000 }).catch((e) => `ariaSnapshot failed: ${e}`);
    fs.writeFileSync(path.join(dir, 'aria.yml'), aria);
    await page.screenshot({ path: path.join(dir, 'screenshot.png'), fullPage }).catch(() => undefined);
    entry.links = await page.$$eval('a[href]', (as) =>
      as.slice(0, 400).map((a) => ({ text: (a.textContent || '').trim().slice(0, 80), href: a.getAttribute('href') })),
    );
    entry.forms = await page.$$eval('form', (fs_) =>
      fs_.map((f) => ({
        id: f.id,
        action: f.getAttribute('action'),
        fields: [...f.querySelectorAll('input, select, textarea, button')].map((el) => ({
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute('type'),
          name: el.getAttribute('name'),
          id: el.id,
          placeholder: el.getAttribute('placeholder'),
          aria: el.getAttribute('aria-label'),
          text: (el.textContent || '').trim().slice(0, 40),
        })),
      })),
    );
  } catch (e) {
    entry.error = String(e).split('\n')[0];
    summary.errors.push(`${name}: ${entry.error}`);
  }
  summary.pages.push(entry);
  console.log(`${name.padEnd(16)} ${entry.status ?? ''} ${entry.url ?? entry.error}`);
  return entry;
}

const pickLink = (entry, re, exclude = /^$/) =>
  (entry.links || []).map((l) => l.href).find((h) => h && sameOrigin(h) && re.test(h) && !exclude.test(h));

// 1. Home
const home = await capture('home', baseUrl + '/');
if (home.status && home.status >= 400) {
  console.error(`\nHome page returned HTTP ${home.status}. Is this machine on the network/VPN that can reach the UAT?`);
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  await browser.close();
  process.exit(1);
}

// 2. Mobile home (menu / overflow)
await page.setViewportSize({ width: 390, height: 844 });
await capture('home-mobile', baseUrl + '/', { fullPage: false });
await page.setViewportSize({ width: 1366, height: 900 });

// 3. A category page: first nav link that looks like a category
await page.goto(baseUrl + '/', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
const navHref = await page
  .locator('header nav a[href], nav a[href], [class*="menu"] a[href], [class*="nav"] a[href]')
  .evaluateAll((as) => as.map((a) => a.href).filter((h) => h && !/#|javascript:|account|login|cart|checkout|wishlist/i.test(h)))
  .catch(() => []);
const category = navHref.find((h) => sameOrigin(h) && new URL(h).pathname.length > 1);
if (category) await capture('category', category);

// 4. Search results
const searchUrls = [`/catalogsearch/result/?q=${encodeURIComponent(searchTerm)}`, `/search?q=${encodeURIComponent(searchTerm)}`];
let search;
await page.goto(baseUrl + '/', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
const box = page.locator('input[type="search"], input[name="q"], input#search, input[placeholder*="search" i], input[placeholder*="بحث"]').first();
if (await box.isVisible().catch(() => false)) {
  await box.fill(searchTerm);
  await box.press('Enter');
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  search = await capture('search', null);
} else {
  for (const u of searchUrls) {
    search = await capture('search', baseUrl + u);
    if (search.status && search.status < 400) break;
  }
}

// 5. Product page: first product-looking link on search or category
let productUrl = process.env.PRODUCT_PATH ? baseUrl + process.env.PRODUCT_PATH : undefined;
if (!productUrl) {
  for (const src of [search, summary.pages.find((p) => p.name === 'category')].filter(Boolean)) {
    await page.goto(src.url, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    productUrl = await page
      .locator('main a.product-item-link[href], main .product-item-info a.product-item-photo[href]')
      .first()
      .getAttribute('href', { timeout: 5_000 })
      .catch(() => undefined);
    if (productUrl) break;
  }
}
if (productUrl) {
  await capture('product', new URL(productUrl, baseUrl).href);
  // Try one add-to-cart so we can see the mini-cart and a non-empty cart.
  const add = page
    .locator('#product-addtocart-button, .product-info-main button.tocart, .product-info-main button.add2cartfinal')
    .or(page.getByRole('button', { name: /add to (cart|bag|basket)|أضف|إضافة/i }))
    .filter({ visible: true })
    .first();
  if (await add.isVisible().catch(() => false)) {
    summary.addToCartButton = await add.evaluate((b) => b.outerHTML.slice(0, 400)).catch(() => undefined);
    // Record every product option control so a disabled add-to-bag can be traced to a missing choice.
    summary.productOptions = await page.$$eval('select, input[type="radio"], input[type="checkbox"]', (els) =>
      els
        .filter((el) => el.closest('form, .product-info-main'))
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          name: el.getAttribute('name'),
          id: el.id,
          required: el.hasAttribute('required') || el.classList.contains('required'),
          options: el.tagName === 'SELECT' ? [...el.options].map((o) => `${o.value}|${o.text.trim()}|${o.disabled}`) : undefined,
        })),
    ).catch(() => undefined);
    await add.click({ timeout: 10_000 }).catch((e) => summary.errors.push(`add-to-cart: ${String(e).split('\n')[0]}`));
    await page.waitForTimeout(4_000);
    await capture('after-add-to-cart', null, { fullPage: false });
  } else {
    summary.errors.push('add-to-cart button not found on product page (may need size/colour selection)');
  }
} else {
  summary.errors.push('no product link found on search/category');
}

// 6. Cart, checkout (view only), account pages
for (const [name, paths] of [
  ['cart', ['/checkout/cart/', '/cart']],
  ['checkout', ['/checkout/']],
  ['login', ['/customer/account/login/', '/account/login', '/login']],
  ['register', ['/customer/account/create/', '/account/register', '/register']],
  ['forgot-password', ['/customer/account/forgotpassword/', '/account/forgot-password', '/forgot-password']],
]) {
  for (const [i, p] of paths.entries()) {
    const e = await capture(name, baseUrl + p);
    if ((e.status && e.status < 400) || i === paths.length - 1) break;
    summary.pages.pop();
  }
}

// 7. Other language: follow a language-switch link if one exists
const langHref =
  pickLink(home, /\/ar(\/|$)|___store=ar|lang=ar/i) ||
  (await page.goto(baseUrl + '/', { waitUntil: 'domcontentloaded' }).then(() =>
    page.locator('a[hreflang], .switcher-language a, a:has-text("العربية"), a:has-text("عربي")').first().getAttribute('href', { timeout: 3_000 }),
  ).catch(() => undefined));
if (langHref) await capture('home-ar', new URL(langHref, baseUrl).href);

summary.consoleErrors = consoleErrors.slice(0, 100);
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
await browser.close();
console.log(`\nSaved to ${outDir}. ${summary.errors.length} issue(s):`);
summary.errors.forEach((e) => console.log(' - ' + e));
