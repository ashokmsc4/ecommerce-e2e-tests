import { test, expect } from '../src/fixtures';

/**
 * Checkout is exercised only up to the payment step.
 * Order placement is blocked at the network layer by the shared fixture, and no test
 * clicks "Place order" or enters card details.
 */
test.describe('Checkout (guest, up to payment)', () => {
  test.beforeEach(async ({ openAnyProduct, product, cart }) => {
    await openAnyProduct();
    await product.addToCart();
    await cart.open();
    await expect(cart.proceedToCheckout).toBeVisible();
  });

  test('proceed to checkout opens the checkout page @smoke', async ({ cart, checkout }) => {
    await cart.proceedToCheckout.click();
    await checkout.expectLoaded();
    await expect(checkout.orderSummary).toBeAttached();
  });

  test('required fields are validated', async ({ cart, checkout }) => {
    await cart.proceedToCheckout.click();
    await checkout.expectLoaded();
    const canContinue = await checkout.nextButton.isVisible().catch(() => false);
    test.skip(!canContinue, 'Single-page checkout without a Next step');
    await checkout.nextButton.click();
    await expect(checkout.fieldErrors.first()).toBeVisible();
  });

  test('invalid email is flagged', async ({ cart, checkout }) => {
    await cart.proceedToCheckout.click();
    await checkout.expectLoaded();
    test.skip(!(await checkout.email.isVisible().catch(() => false)), 'Email field not shown for guest');
    await checkout.email.fill('not-an-email');
    await checkout.email.blur();
    await expect(checkout.fieldErrors.first()).toBeVisible();
  });

  test('guest can fill shipping and reach payment methods', async ({ cart, checkout }) => {
    await cart.proceedToCheckout.click();
    await checkout.expectLoaded();
    await checkout.fillGuestShipping();
    await checkout.chooseFirstShippingMethod();
    await checkout.continueToPayment();
    expect(await checkout.paymentMethods.count()).toBeGreaterThan(0);
    // Stop here. Never place the order.
    await expect(checkout.placeOrderButton).toBeAttached();
  });
});
