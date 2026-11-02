import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductPage extends BasePage {
  readonly name: Locator;
  readonly price: Locator;
  readonly mainImage: Locator;
  readonly qtyInput: Locator;
  readonly addToCartButton: Locator;
  readonly stockStatus: Locator;
  readonly description: Locator;
  readonly swatchOptions: Locator;
  readonly selectOptions: Locator;
  readonly addedConfirmation: Locator;

  constructor(page: Page) {
    super(page);
    this.name = page.locator('h1.page-title, .product-info-main h1, h1.product_title, h1[itemprop="name"], main h1').first();
    this.price = page
      .locator('.product-info-main .price, .product-info-price .price, [itemprop="price"], .product__price, .summary .price, [data-price-type="finalPrice"]')
      .first();
    this.mainImage = page
      .locator('.fotorama__stage img, .gallery-placeholder img, .product-media img, .product__media img, .woocommerce-product-gallery img, main img')
      .first();
    this.qtyInput = page.locator('input#qty, input[name="qty"], input[name="quantity"]').first();
    this.addToCartButton = page
      .locator('#product-addtocart-button, button.tocart, button[name="add"], button.single_add_to_cart_button')
      .or(page.getByRole('button', { name: /add to (cart|bag|basket)|أضف إلى السلة|اضف الى السلة|إضافة إلى السلة/i }))
      // Tasawoq: product carousels below the PDP also have "Add to Cart" (button.add2cartfinal), often off-screen.
      .filter({ visible: true })
      .first();
    this.stockStatus = page.locator('.stock, .product-info-stock-sku .stock, [itemprop="availability"]').first();
    this.description = page.locator('#description, .product.attribute.description, .product__description, #tab-description').first();
    this.swatchOptions = page.locator('.swatch-attribute');
    this.selectOptions = page.locator('.product-options-wrapper select, form[action*="cart"] select, variant-selects select');
    this.addedConfirmation = page
      .locator('.message-success, .minicart-wrapper.active, .block-minicart:visible, .cart-notification:visible, [role="alert"]')
      .or(page.getByText(/you added .* to your (shopping )?cart|added to (cart|bag)|تمت الإضافة|تم إضافة/i))
      .first();
  }

  /** Pick the first available value for every required option (size, colour…). */
  async selectRequiredOptions(): Promise<void> {
    const swatchGroups = await this.swatchOptions.count();
    for (let i = 0; i < swatchGroups; i++) {
      const option = this.swatchOptions.nth(i).locator('.swatch-option:not(.disabled):not([disabled])').first();
      if (await option.isVisible().catch(() => false)) await option.click();
    }
    const selects = await this.selectOptions.count();
    for (let i = 0; i < selects; i++) {
      const sel = this.selectOptions.nth(i);
      const value = await sel
        .locator('option')
        .evaluateAll((opts) => (opts as HTMLOptionElement[]).find((o) => o.value && !o.disabled)?.value ?? '');
      if (value) await sel.selectOption(value);
    }
  }

  async setQty(qty: number): Promise<void> {
    if (await this.qtyInput.isVisible().catch(() => false)) {
      await this.qtyInput.fill(String(qty));
    }
  }

  async addToCart(qty = 1): Promise<void> {
    await this.selectRequiredOptions();
    await this.setQty(qty);
    await expect(this.addToCartButton).toBeEnabled();
    await this.addToCartButton.click();
    await expect(this.addedConfirmation).toBeVisible({ timeout: 20_000 });
  }
}
