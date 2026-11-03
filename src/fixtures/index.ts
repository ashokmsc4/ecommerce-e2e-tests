import { test as base, expect, Page } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { ListingPage } from '../pages/ListingPage';
import { ProductPage } from '../pages/ProductPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { AccountPage } from '../pages/AccountPage';
import { env } from '../config/env';

type Pages = {
  home: HomePage;
  listing: ListingPage;
  product: ProductPage;
  cart: CartPage;
  checkout: CheckoutPage;
  account: AccountPage;
  /** Opens a product detail page: PRODUCT_PATH if set, otherwise the first search hit. */
  openAnyProduct: () => Promise<void>;
};

/** Guard rail: abort any request that would place an order or submit a payment. */
async function blockOrderPlacement(page: Page): Promise<void> {
  await page.route(
    /(payment-information|place-?order|\/checkout\/onepage\/saveOrder|\/orders?$|wc-ajax=checkout|\/checkouts\/.*\/complete)/i,
    (route) => {
      if (route.request().method() === 'POST' || route.request().method() === 'PUT') return route.abort('blockedbyclient');
      return route.continue();
    },
  );
}

export const test = base.extend<Pages>({
  page: async ({ page }, use) => {
    await blockOrderPlacement(page);
    await use(page);
  },
  home: async ({ page }, use) => use(new HomePage(page)),
  listing: async ({ page }, use) => use(new ListingPage(page)),
  product: async ({ page }, use) => use(new ProductPage(page)),
  cart: async ({ page }, use) => use(new CartPage(page)),
  checkout: async ({ page }, use) => use(new CheckoutPage(page)),
  account: async ({ page }, use) => use(new AccountPage(page)),
  openAnyProduct: async ({ home, listing, product, page }, use) => {
    await use(async () => {
      if (env.productPath) {
        await product.goto(env.productPath);
      } else {
        await home.open();
        await home.header.search(env.searchTerm);
        await listing.waitForReady();
        await listing.expectHasProducts();
        // Search hits include out-of-stock items, whose add-to-bag stays disabled, so
        // open results in turn and keep the first one that can be added to the bag.
        const results = listing.productNameLinks;
        const count = Math.min(await results.count(), 8);
        for (let i = 0; i < count; i++) {
          if (i > 0) {
            await page.goBack();
            await listing.waitForReady();
          }
          await results.nth(i).click();
          await listing.waitForReady();
          await expect(product.name).toBeVisible();
          await product.selectRequiredOptions();
          if (await product.addToCartButton.isEnabled().catch(() => false)) break;
        }
      }
      await expect(product.name).toBeVisible();
    });
  },
});

export { expect };
