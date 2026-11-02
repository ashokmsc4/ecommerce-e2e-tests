import { test, expect } from '../src/fixtures';

test.describe('Home page @smoke', () => {
  test.beforeEach(async ({ home }) => {
    await home.open();
  });

  test('loads with a title and no server error', async ({ home, page }) => {
    await expect(page).toHaveTitle(/.+/);
    await home.expectNoServerError();
  });

  test('shows the core header elements', async ({ home }) => {
    await expect(home.header.root).toBeVisible();
    await expect(home.header.logo).toBeVisible();
    await expect(home.header.cartLink).toBeAttached();
    await expect(home.header.accountLink).toBeAttached();
  });

  test('shows merchandised content and a footer', async ({ home }) => {
    await expect(home.heroBanner.or(home.productLinks.first())).toBeVisible();
    await home.footer.scrollIntoViewIfNeeded();
    await expect(home.footer).toBeVisible();
  });

  test('logo returns to the home page', async ({ home, page }) => {
    await page.goto('/customer/account/login/');
    await home.header.logo.click();
    await page.waitForLoadState('domcontentloaded');
    // Home is "/" or a store-code root such as "/en/" or "/ar/".
    expect(new URL(page.url()).pathname).toMatch(/^\/([a-z]{2}([-_][a-z]{2})?\/?)?$/i);
  });

  test('has no broken first-party images above the fold', async ({ page }) => {
    const broken = await page.locator('img:visible').evaluateAll((imgs) =>
      (imgs as HTMLImageElement[])
        .filter((i) => i.complete && i.naturalWidth === 0 && i.src && i.src.startsWith(location.origin))
        .map((i) => i.src),
    );
    expect(broken, `Broken images: ${broken.join(', ')}`).toEqual([]);
  });

  test('does not log uncaught JavaScript errors on load', async ({ page, home }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await home.open();
    await page.waitForLoadState('load');
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
