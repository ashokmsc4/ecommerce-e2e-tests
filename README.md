# ecommerce-e2e-tests

Playwright + TypeScript end-to-end tests for eCommerce storefronts. The first target is the
Tasawoq UAT storefront at `https://tasawoq.uat.aawweb.com`.

## Coverage

| Spec | What it checks |
| --- | --- |
| `home.spec.ts` | Page loads, header (logo, search, cart, account), banners/products, footer, logo → home, broken images, JS errors |
| `navigation.spec.ts` | Main menu categories, category → listing, all top links respond < 400, sort by price, breadcrumbs |
| `search.spec.ts` | Results for a known term, empty state, result → PDP, autocomplete, empty query |
| `product.spec.ts` | Name/price/image/add-to-cart, image loads, h1 + meta description, invalid qty, description |
| `cart.spec.ts` | Empty cart, add to cart + mini-cart count, update qty → subtotal, remove, invalid coupon, persistence on reload |
| `checkout.spec.ts` | Guest checkout up to the payment step, required-field and email validation |
| `account.spec.ts` | Login form, validation, wrong credentials, real login/logout, forgot password, registration |
| `localization.spec.ts` | English ⇄ Arabic switch, `lang`/`dir="rtl"` and Arabic content |
| `responsive.spec.ts` | Mobile viewport: no horizontal overflow, mobile menu |

Tests tagged `@smoke` form a fast subset: `npm run test:smoke`.

### Safety

- **No order is ever placed.** Tests stop at the payment step, never click "Place order", and the
  shared fixture (`src/fixtures/index.ts`) aborts any POST/PUT to order-placement or
  payment-information endpoints as a second guard.
- Registration creates customers with `qa.e2e+<timestamp>@example.com` addresses so they are easy to
  find and delete on UAT. Set `ALLOW_REGISTRATION=false` to skip it.

## Setup

```bash
npm install
npx playwright install --with-deps
cp .env.example .env   # then fill in values
```

| Variable | Purpose |
| --- | --- |
| `BASE_URL` | Storefront URL (defaults to Tasawoq UAT) |
| `HTTP_USERNAME` / `HTTP_PASSWORD` | Basic auth, if the UAT is protected |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | Existing UAT customer; login test skips when empty |
| `SEARCH_TERM` | A term that returns products |
| `SEARCH_TERM_NO_RESULTS` | A term that returns nothing |
| `PRODUCT_PATH` | Optional fixed PDP path (e.g. `/some-product.html`) instead of discovering via search |
| `ALLOW_REGISTRATION` | `false` to skip account-creation tests |

## Running

```bash
npm test                    # all browsers
npm run test:chromium       # desktop Chrome only
npm run test:mobile         # Pixel 7 emulation
npm run test:smoke          # @smoke subset
npx playwright test tests/cart.spec.ts --headed
npm run report              # open the HTML report
```

In GitHub Actions, the `E2E tests` workflow type-checks every PR and runs the suite on demand
(Actions → E2E tests → Run workflow). Add `HTTP_USERNAME`, `HTTP_PASSWORD`, `TEST_USER_EMAIL` and
`TEST_USER_PASSWORD` as repository secrets if needed.

## Structure

```
src/
  config/env.ts        environment variables
  fixtures/index.ts    page-object fixtures + order-placement guard
  pages/               page objects (Header, Home, Listing, Product, Cart, Checkout, Account)
  utils/data.ts        test data builders, price parser (handles Arabic numerals)
tests/                 specs, one per storefront area
```

## Tuning selectors

Page objects combine accessible roles/labels (English and Arabic) with common storefront markup
(Magento 2 Luma/Hyva, Shopify, WooCommerce) using Playwright's `.or()`, so they work across themes
without changes. Once a test fails on a specific element, run `npm run codegen -- $BASE_URL`, pick the
real selector, and replace the fallback chain in the matching page object. Prefer adding
`data-testid` attributes to the theme where possible.

Tests that depend on optional features (autocomplete, coupon form, breadcrumbs, language switcher)
skip with a reason instead of failing when the feature is not present.
