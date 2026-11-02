import { test, expect } from '../src/fixtures';
import { env, hasUserCredentials } from '../src/config/env';
import { newCustomer } from '../src/utils/data';

test.describe('Account: login', () => {
  test.beforeEach(async ({ account }) => {
    await account.openLogin();
  });

  test('login page renders the form @smoke', async ({ account }) => {
    await expect(account.loginEmail).toBeVisible();
    await expect(account.loginPassword).toBeVisible();
    await expect(account.loginButton).toBeVisible();
    await expect(account.forgotPasswordLink).toBeVisible();
  });

  test('empty submit shows required-field errors', async ({ account }) => {
    await account.loginButton.click();
    await expect(account.fieldErrors.first()).toBeVisible();
  });

  test('wrong credentials are rejected', async ({ account, page }) => {
    await account.login(`nobody.${Date.now()}@example.com`, 'WrongPass!123');
    await expect(
      account.messages().or(page.getByText(/incorrect|invalid|not correct|غير صحيح|غير صالح/i)).first(),
    ).toBeVisible();
    await expect(account.dashboard).toBeHidden();
  });

  test('valid user can log in and log out', async ({ account, page }) => {
    test.skip(!hasUserCredentials(), 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD to run');
    await account.login(env.user.email, env.user.password);
    await expect(account.dashboard.or(account.signOutLink)).toBeVisible({ timeout: 20_000 });
    await account.logout();
    await page.goto('/customer/account/');
    await expect(account.loginEmail).toBeVisible();
  });

  test('forgot password accepts an email', async ({ account, page }) => {
    await account.forgotPasswordLink.click();
    await account.waitForReady();
    const email = page.locator('form input[type="email"], input[name="email"]').first();
    await email.fill(`qa.e2e+reset${Date.now()}@example.com`);
    await page.locator('form button[type="submit"]').first().click();
    await account.waitForReady();
    await expect(account.messages().first()).toBeVisible();
  });
});

test.describe('Account: registration', () => {
  test.beforeEach(async ({ account }) => {
    await account.openRegister();
  });

  test('register form validates required fields', async ({ account }) => {
    await account.regSubmit.click();
    await expect(account.fieldErrors.first()).toBeVisible();
  });

  test('register rejects mismatched password confirmation', async ({ account }) => {
    test.skip(!(await account.regConfirmPassword.isVisible().catch(() => false)), 'No confirm-password field');
    const c = newCustomer();
    await account.regEmail.fill(c.email);
    await account.regPassword.fill(c.password);
    await account.regConfirmPassword.fill(`${c.password}x`);
    await account.regSubmit.click();
    await expect(account.fieldErrors.first()).toBeVisible();
  });

  test('new customer can register', async ({ account }) => {
    test.skip(!env.allowRegistration, 'ALLOW_REGISTRATION=false');
    await account.register();
    await expect(account.dashboard.or(account.signOutLink).or(account.messages().first())).toBeVisible({ timeout: 20_000 });
    await expect(account.fieldErrors).toHaveCount(0);
  });
});
