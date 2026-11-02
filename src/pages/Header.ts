import { Locator, Page } from '@playwright/test';

export class Header {
  readonly root: Locator;
  readonly logo: Locator;
  readonly searchInput: Locator;
  readonly searchToggle: Locator;
  readonly cartLink: Locator;
  readonly cartCount: Locator;
  readonly accountLink: Locator;
  readonly languageSwitcher: Locator;
  readonly mainNav: Locator;
  readonly mobileMenuToggle: Locator;

  constructor(readonly page: Page) {
    this.root = page.locator('header, .page-header, [role="banner"]').first();
    this.logo = page
      .locator('a.logo, .logo a, header a[href="/"], header a[aria-label*="home" i]')
      .or(page.getByRole('link', { name: /home|logo|tasawoq|تسوق/i }))
      .first();
    this.searchInput = page
      .getByRole('searchbox')
      .or(page.getByRole('combobox', { name: /search|بحث/i }))
      .or(page.locator('input#search, input[name="q"], input[type="search"], input[placeholder*="search" i], input[placeholder*="بحث"]'))
      .first();
    this.searchToggle = page
      .locator('.block-search .label, [data-role="minisearch-label"], button[aria-label*="search" i], .search-toggle')
      .first();
    this.cartLink = page
      .locator('a.showcart, [data-block="minicart"] a, a[href*="/checkout/cart"], a[href*="/cart"]')
      .or(page.getByRole('link', { name: /cart|bag|basket|السلة|عربة/i }))
      .first();
    this.cartCount = page.locator('.counter-number, .cart-count, .minicart-qty, [data-cart-count]').first();
    this.accountLink = page
      .locator('a[href*="/customer/account"], a[href*="/account"], .authorization-link a')
      .or(page.getByRole('link', { name: /sign in|log ?in|my account|account|تسجيل الدخول|حسابي/i }))
      .first();
    this.languageSwitcher = page
      .locator('.switcher-language, #switcher-language, .language-switcher, [data-ui-id*="language"], a[hreflang], a[href*="___store"]')
      .or(page.getByRole('link', { name: /^(english|en|العربية|عربي|ar)$/i }))
      .or(page.getByRole('button', { name: /^(english|en|العربية|عربي|ar)$/i }))
      .first();
    this.mainNav = page.locator('nav.navigation, .nav-sections nav, nav[role="navigation"], header nav, .main-menu').first();
    this.mobileMenuToggle = page.locator('.nav-toggle, [data-action="toggle-nav"], button[aria-label*="menu" i]').first();
  }

  async openMenuIfCollapsed(): Promise<void> {
    if (!(await this.mainNav.isVisible().catch(() => false)) && (await this.mobileMenuToggle.isVisible().catch(() => false))) {
      await this.mobileMenuToggle.click();
    }
  }

  /** Top-level category links in the main navigation. */
  async topCategoryLinks(): Promise<Locator> {
    await this.openMenuIfCollapsed();
    return this.mainNav.locator('a[href]:visible').filter({ hasNotText: /^\s*$/ });
  }

  async search(term: string): Promise<void> {
    if (!(await this.searchInput.isVisible().catch(() => false))) {
      await this.searchToggle.click().catch(() => undefined);
    }
    await this.searchInput.click();
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
  }

  async readCartCount(): Promise<number> {
    const text = (await this.cartCount.textContent({ timeout: 2_000 }).catch(() => '')) ?? '';
    const n = parseInt(text.replace(/\D/g, ''), 10);
    return Number.isNaN(n) ? 0 : n;
  }
}
