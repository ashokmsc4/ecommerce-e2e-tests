import { Page } from '@playwright/test';
import { test, expect } from '../src/fixtures';

/**
 * Text direction as rendered. Tasawoq's Arabic store sets lang="ar" but no dir attribute on <html>;
 * RTL comes from the theme CSS, so check the computed direction rather than the attribute.
 */
const direction = (page: Page) =>
  page.evaluate(() => document.documentElement.getAttribute('dir') || getComputedStyle(document.body).direction);

test.describe('Language switch (English / Arabic)', () => {
  test('switching language changes lang/dir and keeps the site working', async ({ home, page }) => {
    await home.open();
    const switcher = home.header.languageSwitcher;
    test.skip(!(await switcher.isVisible().catch(() => false)), 'No language switcher on this storefront');

    const html = page.locator('html');
    const langBefore = ((await html.getAttribute('lang')) ?? '').toLowerCase();
    const dirBefore = (await direction(page)).toLowerCase();

    await switcher.click();
    // Magento renders a dropdown; other themes switch directly on click.
    const option = page
      .locator('.switcher-dropdown a, .switcher-options a, .language-switcher a, a[hreflang]')
      .filter({ hasNotText: new RegExp(`^\\s*${langBefore.slice(0, 2) || 'xx'}\\s*$`, 'i') })
      .first();
    if (await option.isVisible().catch(() => false)) await option.click();
    await page.waitForLoadState('domcontentloaded');
    await home.waitForReady();

    await expect.poll(async () => ((await html.getAttribute('lang')) ?? '').toLowerCase()).not.toBe(langBefore);
    const langAfter = ((await html.getAttribute('lang')) ?? '').toLowerCase();
    const dirAfter = (await direction(page)).toLowerCase();
    if (langAfter.startsWith('ar')) expect(dirAfter).toBe('rtl');
    if (langBefore.startsWith('ar')) expect(dirBefore).toBe('rtl');

    await home.expectNoServerError();
    await expect(home.header.logo).toBeVisible();
  });

  test('Arabic store renders right-to-left with Arabic text', async ({ home, page }) => {
    await home.open();
    const arLink = page
      .locator('a[hreflang^="ar"], .switcher-language a, a[href$="/ar/"]')
      .filter({ hasText: /العربية|عربي|AR/ })
      .filter({ visible: true })
      .first();
    const hrefLangAr = await page.locator('link[rel="alternate"][hreflang^="ar"]').first().getAttribute('href').catch(() => null);
    if (await arLink.isVisible().catch(() => false)) {
      await arLink.click();
    } else if (hrefLangAr) {
      await page.goto(hrefLangAr);
    } else {
      test.skip(true, 'No Arabic store discoverable');
    }
    await home.waitForReady();
    await expect(page.locator('html')).toHaveAttribute('lang', /^ar/i);
    await expect.poll(() => direction(page)).toBe('rtl');
    await expect(page.locator('body')).toContainText(/[؀-ۿ]/);
  });
});
