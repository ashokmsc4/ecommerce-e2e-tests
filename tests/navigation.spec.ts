import { test, expect } from '../src/fixtures';

test.describe('Navigation and categories', () => {
  test('main menu exposes top-level categories @smoke', async ({ home }) => {
    await home.open();
    const links = await home.header.topCategoryLinks();
    expect(await links.count()).toBeGreaterThan(0);
  });

  test('first category opens a product listing', async ({ home, listing, page }) => {
    await home.open();
    const links = await home.header.topCategoryLinks();
    const first = links.first();
    const href = await first.getAttribute('href');
    expect(href).toBeTruthy();
    await first.click();
    await listing.waitForReady();
    await listing.expectNoServerError();
    await expect(listing.title).toBeVisible();
    await expect(listing.productItems.first().or(listing.page.locator('.category-view, .subcategories, .category-cms'))).toBeVisible();
    expect(page.url()).not.toBe(home.page.url().replace(/\/$/, '') + '/');
  });

  test('every top-level category link responds without an error', async ({ home, request }) => {
    await home.open();
    const links = await home.header.topCategoryLinks();
    const hrefs = [...new Set((await links.evaluateAll((as) => (as as HTMLAnchorElement[]).map((a) => a.href))).filter((h) => h.startsWith('http') && !h.includes('#')))];
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs.slice(0, 15)) {
      const res = await request.get(href);
      expect.soft(res.status(), href).toBeLessThan(400);
    }
  });

  test('category listing can be sorted by price', async ({ home, listing }) => {
    await home.open();
    await (await home.header.topCategoryLinks()).first().click();
    await listing.waitForReady();
    test.skip((await listing.productItems.count()) < 2, 'First category has fewer than two products');
    const sorted = await listing.sortBy(/price/i);
    test.skip(!sorted, 'No price sorter on this listing');
    await listing.expectHasProducts();
    const prices = await listing.visiblePrices(6);
    expect(prices.length).toBeGreaterThan(0);
  });

  test('breadcrumbs appear on a category page', async ({ home, listing }) => {
    await home.open();
    await (await home.header.topCategoryLinks()).first().click();
    await listing.waitForReady();
    test.skip(!(await listing.breadcrumbs.isVisible().catch(() => false)), 'Theme does not render breadcrumbs');
    await expect(listing.breadcrumbs).toContainText(/.+/);
  });
});
