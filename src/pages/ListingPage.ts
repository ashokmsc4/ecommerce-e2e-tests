import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { parsePrice } from '../utils/data';

/** Category (PLP) and search-results pages share the same product grid. */
export class ListingPage extends BasePage {
  readonly title: Locator;
  readonly productItems: Locator;
  readonly productNameLinks: Locator;
  readonly productPrices: Locator;
  readonly sorter: Locator;
  readonly filters: Locator;
  readonly emptyState: Locator;
  readonly pagerNext: Locator;
  readonly breadcrumbs: Locator;

  constructor(page: Page) {
    super(page);
    this.title = page.locator('h1, .page-title').first();
    this.productItems = page.locator(
      'ol.products li.product-item, .products-grid .product-item, .product-grid-item, .product-card, li.product, [data-product-id]',
    ).filter({ visible: true });
    this.productNameLinks = page.locator(
      'a.product-item-link, .product-item-name a, .product-card__title a, .woocommerce-loop-product__link, .product-item-info a[href]:not([href*="wishlist"]):not([href*="compare"])',
    );
    this.productPrices = page.locator('.product-item .price, .product-card .price, li.product .price, [data-price-amount]');
    this.sorter = page.locator('#sorter, select.sorter-options, select[name="product_list_order"], select[name="orderby"], select[name*="sort" i]').first();
    this.filters = page.locator('#layered-filter-block, .block.filter, .filters, .facets, aside [class*="filter"]').first();
    this.emptyState = page
      .locator('.message.notice, .search.results .message, .no-results, .empty')
      .or(page.getByText(/no results|returned no results|no products|couldn.t find|did not match|0 items?\b|لا توجد نتائج|لم يتم العثور/i))
      .first();
    this.pagerNext = page.locator('.pages .action.next, a.next, [rel="next"]').first();
    this.breadcrumbs = page.locator('.breadcrumbs, nav[aria-label*="breadcrumb" i]').first();
  }

  async expectHasProducts(): Promise<void> {
    await expect(this.productItems.first()).toBeVisible();
    expect(await this.productItems.count()).toBeGreaterThan(0);
  }

  async openFirstProduct(): Promise<string> {
    const link = this.productNameLinks.first();
    await expect(link).toBeVisible();
    const name = ((await link.textContent()) ?? '').trim();
    await link.click();
    await this.waitForReady();
    return name;
  }

  async visiblePrices(limit = 10): Promise<number[]> {
    const texts = await this.productPrices.allTextContents();
    return texts.slice(0, limit).map(parsePrice).filter((n) => !Number.isNaN(n));
  }

  async sortBy(optionLabelOrValue: RegExp): Promise<boolean> {
    if (!(await this.sorter.isVisible().catch(() => false))) return false;
    const options = await this.sorter.locator('option').evaluateAll((els) =>
      els.map((e) => ({ value: (e as HTMLOptionElement).value, label: (e.textContent ?? '').trim() })),
    );
    const match = options.find((o) => optionLabelOrValue.test(o.value) || optionLabelOrValue.test(o.label));
    if (!match) return false;
    await Promise.all([this.page.waitForLoadState('domcontentloaded'), this.sorter.selectOption(match.value)]);
    await this.waitForReady();
    return true;
  }
}
