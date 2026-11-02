import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { newCustomer } from '../utils/data';

export class AccountPage extends BasePage {
  readonly loginEmail: Locator;
  readonly loginPassword: Locator;
  readonly loginButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly createAccountLink: Locator;

  readonly regFirstName: Locator;
  readonly regLastName: Locator;
  readonly regEmail: Locator;
  readonly regPhone: Locator;
  readonly regPassword: Locator;
  readonly regConfirmPassword: Locator;
  readonly regSubmit: Locator;

  readonly dashboard: Locator;
  readonly signOutLink: Locator;
  readonly fieldErrors: Locator;

  constructor(page: Page) {
    super(page);
    const loginForm = page.locator('form#login-form, form.form-login, form.woocommerce-form-login, form[action*="login"]').first();
    this.loginEmail = loginForm.locator('input[type="email"], input[name="login[username]"], input[name="username"], input[name="email"]').first();
    this.loginPassword = loginForm.locator('input[type="password"]').first();
    this.loginButton = loginForm
      .locator('button[type="submit"], button.login, #send2')
      .first();
    this.forgotPasswordLink = page
      .locator('a.remind, a[href*="forgotpassword"], a[href*="lost-password"]')
      .or(page.getByRole('link', { name: /forgot (your )?password|نسيت كلمة/i }))
      .first();
    this.createAccountLink = page
      .locator('a[href*="/customer/account/create"], a[href*="register"]')
      .or(page.getByRole('link', { name: /create (an )?account|register|إنشاء حساب|تسجيل/i }))
      .first();

    const regForm = page.locator('form#form-validate, form.form-create-account, form.woocommerce-form-register, form[action*="create"], form[action*="register"]').first();
    this.regFirstName = regForm.locator('input[name="firstname"], input[name="first_name"], input[name="customer[first_name]"]').first();
    this.regLastName = regForm.locator('input[name="lastname"], input[name="last_name"], input[name="customer[last_name]"]').first();
    this.regEmail = regForm.locator('input[name="email"], input[type="email"]').first();
    this.regPhone = regForm.locator('input[name="telephone"], input[name="mobile"], input[name="phone"], input[type="tel"]').first();
    this.regPassword = regForm.locator('input[name="password"], input#password').first();
    this.regConfirmPassword = regForm.locator('input[name="password_confirmation"], input#password-confirmation').first();
    this.regSubmit = regForm.locator('button[type="submit"], button.submit').first();

    this.dashboard = page
      .locator('.customer-account-index, .block-dashboard-info, .woocommerce-MyAccount-content, [class*="account-dashboard"]')
      .or(page.getByRole('heading', { name: /my account|my dashboard|حسابي/i }))
      .first();
    this.signOutLink = page
      .locator('a[href*="/customer/account/logout"], a[href*="logout"]')
      .or(page.getByRole('link', { name: /sign out|log ?out|تسجيل الخروج/i }))
      .first();
    this.fieldErrors = page.locator('.mage-error:visible, .field-error, .woocommerce-error, [aria-invalid="true"], .message-error');
  }

  async openLogin(): Promise<void> {
    await this.goto('/customer/account/login/');
    if (!(await this.loginEmail.isVisible().catch(() => false))) {
      await this.goto('/');
      await this.header.accountLink.click();
      await this.waitForReady();
    }
    await expect(this.loginEmail).toBeVisible();
  }

  async openRegister(): Promise<void> {
    await this.goto('/customer/account/create/');
    if (!(await this.regEmail.isVisible().catch(() => false))) {
      await this.openLogin();
      await this.createAccountLink.click();
      await this.waitForReady();
    }
    await expect(this.regEmail).toBeVisible();
  }

  async login(email: string, password: string): Promise<void> {
    await this.loginEmail.fill(email);
    await this.loginPassword.fill(password);
    await this.loginButton.click();
    await this.waitForReady();
  }

  async register(c = newCustomer()): Promise<ReturnType<typeof newCustomer>> {
    await this.regFirstName.fill(c.firstName).catch(() => undefined);
    await this.regLastName.fill(c.lastName).catch(() => undefined);
    await this.regEmail.fill(c.email);
    if (await this.regPhone.isVisible().catch(() => false)) await this.regPhone.fill(c.phone);
    await this.regPassword.fill(c.password);
    if (await this.regConfirmPassword.isVisible().catch(() => false)) await this.regConfirmPassword.fill(c.password);
    await this.regSubmit.click();
    await this.waitForReady();
    return c;
  }

  async logout(): Promise<void> {
    await this.page.goto('/customer/account/logout/').catch(() => undefined);
    await this.waitForReady();
  }
}
