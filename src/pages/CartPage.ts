import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { parsePrice } from '../utils/data';

export class CartPage extends BasePage {
  readonly items: Locator;
  readonly itemNames: Locator;
  readonly qtyInputs: Locator;
  readonly updateButton: Locator;
  readonly removeButtons: Locator;
  readonly subtotal: Locator;
  readonly grandTotal: Locator;
  readonly couponToggle: Locator;
  readonly couponInput: Locator;
  readonly applyCouponButton: Locator;
  readonly proceedToCheckout: Locator;
  readonly emptyCart: Locator;

  constructor(page: Page) {
    super(page);
    this.items = page.locator('#shopping-cart-table tbody.cart.item, .cart.item, .cart-item, tr.woocommerce-cart-form__cart-item, [data-cart-item]');
    this.itemNames = page.locator('.cart.item .product-item-name a, .cart-item__name, td.product-name a');
    this.qtyInputs = page.locator('input[data-role="cart-item-qty"], input.qty, input[name*="qty"], input[name*="quantity"], input[name="updates[]"]');
    this.updateButton = page
      .locator('button.update, button[name="update_cart_action"], button[name="update_cart"]')
      .or(page.getByRole('button', { name: /update (shopping )?cart|تحديث/i }))
      .first();
    this.removeButtons = page
      .locator('.action-delete, a.remove, cart-remove-button a, button[aria-label*="remove" i]')
      .or(page.getByRole('button', { name: /remove|delete|حذف|إزالة/i }));
    this.subtotal = page.locator('.totals.sub .price, .cart-subtotal .amount, .totals__subtotal-value, [data-th="Subtotal"] .price').first();
    this.grandTotal = page.locator('.grand.totals .price, .order-total .amount, .totals__total-value, [data-th="Order Total"] .price').first();
    this.couponToggle = page.locator('#block-discount-heading, .block.discount .title, .showcoupon').first();
    this.couponInput = page.locator('#coupon_code, input[name="coupon_code"], input[name="discount"]').first();
    this.applyCouponButton = page
      .locator('#discount-coupon-form button.apply, button[name="apply_coupon"]')
      .or(page.getByRole('button', { name: /apply (discount|coupon)|تطبيق/i }))
      .first();
    this.proceedToCheckout = page
      .locator('button[data-role="proceed-to-checkout"], .checkout-methods-items .checkout, a.checkout-button, button[name="checkout"]')
      .or(page.getByRole('button', { name: /proceed to checkout|checkout|إتمام الطلب|الدفع/i }))
      .or(page.getByRole('link', { name: /proceed to checkout|checkout|إتمام الطلب|الدفع/i }))
      .first();
    this.emptyCart = page
      .locator('.cart-empty, .cart-empty-message, .cart__empty-text')
      .or(page.getByText(/you have no items in your shopping cart|your cart is (currently )?empty|السلة فارغة|لا توجد منتجات في سلة/i))
      .first();
  }

  async open(): Promise<void> {
    // Magento path first; most platforms redirect /cart or /checkout/cart appropriately.
    await this.goto('/checkout/cart/');
    if (/404|not.found/i.test(await this.page.title())) await this.goto('/cart');
  }

  async itemCount(): Promise<number> {
    return this.items.count();
  }

  async setFirstItemQty(qty: number): Promise<void> {
    const input = this.qtyInputs.first();
    await input.fill(String(qty));
    if (await this.updateButton.isVisible().catch(() => false)) {
      await this.updateButton.click();
    } else {
      await input.press('Enter');
    }
    await this.waitForReady();
  }

  async firstItemQty(): Promise<number> {
    return parseInt(await this.qtyInputs.first().inputValue(), 10);
  }

  async removeAll(): Promise<void> {
    for (let guard = 0; guard < 20 && (await this.items.count()) > 0; guard++) {
      await this.removeButtons.first().click();
      await this.waitForReady();
    }
    await expect(this.emptyCart).toBeVisible();
  }

  async subtotalValue(): Promise<number> {
    return parsePrice((await this.subtotal.textContent()) ?? '');
  }

  async applyCoupon(code: string): Promise<void> {
    if (!(await this.couponInput.isVisible().catch(() => false))) await this.couponToggle.click();
    await this.couponInput.fill(code);
    await this.applyCouponButton.click();
    await this.waitForReady();
  }
}
