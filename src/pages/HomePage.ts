import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly heroBanner: Locator;
  readonly productLinks: Locator;
  readonly footer: Locator;
  readonly newsletterInput: Locator;

  constructor(page: Page) {
    super(page);
    this.heroBanner = page
      .locator('.slick-slider, .swiper, .owl-carousel, .banner, .hero, [class*="slider"], [class*="banner"]')
      .first();
    this.productLinks = page.locator(
      '.product-item a.product-item-link, .product-item-info a[href], .product-card a[href], a.product-item-photo, [data-product-id] a[href]',
    ).filter({ visible: true });
    this.footer = page.locator('footer, .page-footer, [role="contentinfo"]').first();
    this.newsletterInput = page.locator('#newsletter, input[name="email"][id*="newsletter"], footer input[type="email"]').first();
  }

  async open(): Promise<void> {
    await this.goto('/');
  }
}
