import { test, expect } from '../src/fixtures';

test.describe('Responsive layout', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('mobile home has no horizontal overflow and a usable menu', async ({ home, page }) => {
    await home.open();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(2);
    if (await home.header.mobileMenuToggle.isVisible().catch(() => false)) {
      await home.header.mobileMenuToggle.click();
      await expect(home.header.mainNav).toBeVisible();
    }
  });
});
