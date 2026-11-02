import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { guestShipping } from '../utils/data';

type Address = ReturnType<typeof guestShipping>;

/**
 * Checkout up to (but never including) order placement.
 * The suite must NEVER click "Place order" or submit real payment details.
 */
export class CheckoutPage extends BasePage {
  readonly email: Locator;
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly street: Locator;
  readonly city: Locator;
  readonly postcode: Locator;
  readonly country: Locator;
  readonly region: Locator;
  readonly phone: Locator;
  readonly shippingMethods: Locator;
  readonly nextButton: Locator;
  readonly paymentSection: Locator;
  readonly paymentMethods: Locator;
  readonly orderSummary: Locator;
  readonly fieldErrors: Locator;
  readonly placeOrderButton: Locator;

  constructor(page: Page) {
    super(page);
    const field = (names: string[], label: RegExp) =>
      page
        .locator(names.map((n) => `#shipping-new-address-form [name="${n}"], form [name="${n}"]`).join(', '))
        .or(page.getByLabel(label))
        .first();

    this.email = page.locator('#customer-email, input[name="username"][type="email"], input#email, input[name="email"]').first();
    this.firstName = field(['firstname', 'billing_first_name', 'firstName'], /first name|الاسم الأول/i);
    this.lastName = field(['lastname', 'billing_last_name', 'lastName'], /last name|اسم العائلة/i);
    this.street = field(['street[0]', 'billing_address_1', 'address1'], /street|address|العنوان|الشارع/i);
    this.city = field(['city', 'billing_city'], /city|المدينة/i);
    this.postcode = field(['postcode', 'billing_postcode', 'postalCode'], /zip|postal|postcode|الرمز البريدي/i);
    this.country = page.locator('select[name="country_id"], select[name="billing_country"], select[name="countryCode"]').first();
    this.region = page.locator('select[name="region_id"], input[name="region"]').first();
    this.phone = field(['telephone', 'billing_phone', 'phone'], /phone|mobile|الهاتف|الجوال/i);
    this.shippingMethods = page.locator('#checkout-shipping-method-load input[type="radio"], .table-checkout-shipping-method input[type="radio"], input[name^="shipping_method"]');
    this.nextButton = page
      .locator('#shipping-method-buttons-container button, button[data-role="opc-continue"]')
      .or(page.getByRole('button', { name: /^(next|continue( to (payment|shipping))?|التالي|متابعة)$/i }))
      .first();
    this.paymentSection = page.locator('#checkout-step-payment, .payment-method, .checkout-payment-method, #payment, [data-step="payment"]').first();
    this.paymentMethods = page.locator('.payment-method input[type="radio"], input[name="payment[method]"], input[name="payment_method"]');
    this.orderSummary = page.locator('.opc-block-summary, #order_review, .order-summary, [class*="summary"]').first();
    this.fieldErrors = page.locator('.field-error, .mage-error:visible, .woocommerce-error, [aria-invalid="true"]');
    this.placeOrderButton = page
      .locator('button.checkout[title*="Place" i], #place_order')
      .or(page.getByRole('button', { name: /place order|تأكيد الطلب|إتمام الشراء/i }))
      .first();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/checkout/i, { timeout: 30_000 });
    await this.waitForReady();
    await expect(this.email.or(this.firstName)).toBeVisible({ timeout: 30_000 });
  }

  private async fillIfVisible(locator: Locator, value: string): Promise<void> {
    if (await locator.isVisible().catch(() => false)) await locator.fill(value);
  }

  async fillGuestShipping(a: Address = guestShipping()): Promise<void> {
    await this.fillIfVisible(this.email, a.email);
    if (await this.country.isVisible().catch(() => false)) {
      await this.country.selectOption({ label: a.country }).catch(() => undefined);
      await this.waitForReady();
    }
    await this.fillIfVisible(this.firstName, a.firstName);
    await this.fillIfVisible(this.lastName, a.lastName);
    await this.fillIfVisible(this.street, a.street);
    await this.fillIfVisible(this.city, a.city);
    await this.fillIfVisible(this.postcode, a.postcode);
    await this.fillIfVisible(this.phone, a.phone);
    if (await this.region.isVisible().catch(() => false)) {
      const tag = await this.region.evaluate((el) => el.tagName.toLowerCase());
      if (tag === 'select') {
        const v = await this.region.locator('option').evaluateAll((o) => (o as HTMLOptionElement[]).find((x) => x.value)?.value ?? '');
        if (v) await this.region.selectOption(v);
      } else {
        await this.region.fill(a.city);
      }
    }
    await this.waitForReady();
  }

  async chooseFirstShippingMethod(): Promise<void> {
    await this.shippingMethods.first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined);
    if ((await this.shippingMethods.count()) > 0) await this.shippingMethods.first().check({ force: true });
  }

  async continueToPayment(): Promise<void> {
    await this.nextButton.click();
    await this.waitForReady();
    await expect(this.paymentSection).toBeVisible({ timeout: 30_000 });
  }
}
