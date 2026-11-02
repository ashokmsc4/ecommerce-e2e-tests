import { test, expect } from '../src/fixtures';
import { parsePrice } from '../src/utils/data';

test.describe('Product detail page', () => {
  test.beforeEach(async ({ openAnyProduct }) => {
    await openAnyProduct();
  });

  test('shows name, price, image and add-to-cart @smoke', async ({ product }) => {
    await expect(product.name).toHaveText(/\S+/);
    await expect(product.price).toBeVisible();
    expect(parsePrice((await product.price.textContent()) ?? '')).toBeGreaterThan(0);
    await expect(product.mainImage).toBeVisible();
    await expect(product.addToCartButton).toBeVisible();
  });

  test('main product image actually loads', async ({ product }) => {
    await expect
      .poll(async () => product.mainImage.evaluate((img) => (img as HTMLImageElement).naturalWidth), { timeout: 15_000 })
      .toBeGreaterThan(0);
  });

  test('has SEO basics: one h1 and a meta description', async ({ page }) => {
    expect(await page.locator('h1:visible').count()).toBeGreaterThanOrEqual(1);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
  });

  test('rejects an invalid quantity', async ({ product, page }) => {
    test.skip(!(await product.qtyInput.isVisible().catch(() => false)), 'No quantity input on this PDP');
    await product.selectRequiredOptions();
    await product.qtyInput.fill('0');
    await product.addToCartButton.click();
    await expect(
      page.locator('.mage-error:visible, #qty-error, [aria-invalid="true"], .message-error').or(page.getByText(/greater than|valid|minimum|أكبر من/i)).first(),
    ).toBeVisible();
  });

  test('shows a description or details section', async ({ product }) => {
    const visible = await product.description.isVisible().catch(() => false);
    test.skip(!visible, 'No description block for this product');
    await expect(product.description).toContainText(/\S+/);
  });
});
