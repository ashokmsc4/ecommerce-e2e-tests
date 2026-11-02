import { Locator, Page, expect } from '@playwright/test';
import { Header } from './Header';

/**
 * Shared behaviour for every page object.
 *
 * Selectors throughout this suite combine accessible roles/text (English and Arabic)
 * with common storefront markup (Magento 2 / Hyva, Shopify, WooCommerce) via `.or()`,
 * so the suite tolerates theme differences. Tighten them to the real markup once the
 * site has been inspected (see README "Tuning selectors").
 */
export class BasePage {
  readonly header: Header;

  constructor(readonly page: Page) {
    this.header = new Header(page);
  }

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.waitForReady();
    await this.dismissOverlays();
  }

  async waitForReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    // Magento shows a full-page loader mask while RequireJS/KO boots.
    const loader = this.page.locator('.loading-mask, .loader, [data-role="loader"]').first();
    await loader.waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => undefined);
  }

  /** Close cookie banners, newsletter popups and similar modals if they appear. */
  async dismissOverlays(): Promise<void> {
    const candidates: Locator[] = [
      this.page.getByRole('button', { name: /accept( all)?( cookies)?|allow( all)?|got it|agree|موافق|قبول/i }),
      this.page.locator('#btn-cookie-allow, .cookie-notice button, #onetrust-accept-btn-handler'),
      this.page.locator('.modal-popup._show .action-close, .newsletter-popup .close, [aria-label="Close"]:visible'),
    ];
    for (const c of candidates) {
      const el = c.first();
      if (await el.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await el.click({ timeout: 3_000 }).catch(() => undefined);
      }
    }
  }

  async expectNoServerError(): Promise<void> {
    await expect(this.page.locator('body')).not.toContainText(
      /(404 not found|page not found|500 internal|there has been an error processing your request|whoops)/i,
    );
  }

  /** Global success/error toast messages (Magento `.messages`, generic alerts). */
  messages(): Locator {
    return this.page.locator('.page.messages .message, .messages .message, [role="alert"]');
  }
}
