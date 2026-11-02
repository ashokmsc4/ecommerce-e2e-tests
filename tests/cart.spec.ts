import { test, expect } from '../src/fixtures';

test.describe('Cart', () => {
  test('empty cart shows an empty message', async ({ cart }) => {
    await cart.open();
    await expect(cart.emptyCart).toBeVisible();
  });

  test('add a product, see it in the cart @smoke', async ({ openAnyProduct, product, cart }) => {
    await openAnyProduct();
    const name = ((await product.name.textContent()) ?? '').trim();
    await product.addToCart();
    await expect.poll(() => product.header.readCartCount(), { timeout: 15_000 }).toBeGreaterThan(0);
    await cart.open();
    expect(await cart.itemCount()).toBeGreaterThan(0);
    if (name) await expect(cart.page.locator('body')).toContainText(name.slice(0, 20));
    await expect(cart.subtotal).toBeVisible();
  });

  test('update quantity recalculates the subtotal', async ({ openAnyProduct, product, cart }) => {
    await openAnyProduct();
    await product.addToCart();
    await cart.open();
    const before = await cart.subtotalValue();
    await cart.setFirstItemQty(2);
    await expect.poll(() => cart.firstItemQty()).toBe(2);
    await expect.poll(() => cart.subtotalValue(), { timeout: 15_000 }).toBeGreaterThan(before);
  });

  test('remove item empties the cart', async ({ openAnyProduct, product, cart }) => {
    await openAnyProduct();
    await product.addToCart();
    await cart.open();
    await cart.removeAll();
    expect(await cart.itemCount()).toBe(0);
  });

  test('invalid coupon is rejected', async ({ openAnyProduct, product, cart }) => {
    await openAnyProduct();
    await product.addToCart();
    await cart.open();
    const hasCoupon = (await cart.couponInput.isVisible().catch(() => false)) || (await cart.couponToggle.isVisible().catch(() => false));
    test.skip(!hasCoupon, 'No coupon form on cart page');
    await cart.applyCoupon('INVALID-E2E-CODE');
    await expect(
      cart.page.locator('.message-error, .woocommerce-error, [role="alert"]').or(cart.page.getByText(/not valid|invalid|غير صالح|غير صحيح/i)).first(),
    ).toBeVisible();
  });

  test('cart persists across a page reload', async ({ openAnyProduct, product, cart, page }) => {
    await openAnyProduct();
    await product.addToCart();
    await cart.open();
    const count = await cart.itemCount();
    await page.reload();
    await cart.waitForReady();
    expect(await cart.itemCount()).toBe(count);
  });
});
