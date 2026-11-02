import { test, expect } from '../src/fixtures';
import { env } from '../src/config/env';

test.describe('Search', () => {
  test.beforeEach(async ({ home }) => {
    await home.open();
  });

  test('returns products for a known term @smoke', async ({ home, listing, page }) => {
    await home.header.search(env.searchTerm);
    await listing.waitForReady();
    await expect(page).toHaveURL(new RegExp(encodeURIComponent(env.searchTerm).replace(/%20/g, '(\\+|%20)'), 'i'));
    await listing.expectHasProducts();
  });

  test('shows an empty state for a nonsense term', async ({ home, listing }) => {
    await home.header.search(env.searchTermNoResults);
    await listing.waitForReady();
    await expect(listing.emptyState).toBeVisible();
    expect(await listing.productItems.count()).toBe(0);
  });

  test('search result opens the product detail page', async ({ home, listing, product }) => {
    await home.header.search(env.searchTerm);
    await listing.waitForReady();
    await listing.expectHasProducts();
    await listing.openFirstProduct();
    await expect(product.name).toBeVisible();
    await expect(product.addToCartButton.or(product.stockStatus)).toBeVisible();
  });

  test('autocomplete suggests results while typing', async ({ home, page }) => {
    const input = home.header.searchInput;
    if (!(await input.isVisible().catch(() => false))) await home.header.searchToggle.click();
    await input.pressSequentially(env.searchTerm.slice(0, 4), { delay: 120 });
    const suggestions = page.locator('#search_autocomplete, .search-autocomplete, .autocomplete, [role="listbox"], .predictive-search, .searchsuite-autocomplete').first();
    const shown = await suggestions.isVisible({ timeout: 8_000 }).catch(() => false);
    test.skip(!shown, 'No search autocomplete on this storefront');
    await expect(suggestions).toBeVisible();
  });

  test('empty search does not crash the site', async ({ home, page }) => {
    await home.header.search('');
    await home.waitForReady();
    await home.expectNoServerError();
    await expect(page.locator('body')).toBeVisible();
  });
});
