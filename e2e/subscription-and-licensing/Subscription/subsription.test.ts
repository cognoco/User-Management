import { test, expect } from '@playwright/test';

// --- Constants and Test Data --- //
const USER_EMAIL = process.env.E2E_USER_EMAIL || 'user@example.com';
const USER_PASSWORD = process.env.E2E_USER_PASSWORD || 'password123';
const SUBSCRIPTION_URL = '/subscription';
const PLANS_URL = '/subscription/plans';

// --- Test Suite --- //
test.describe('Subscription Management Flows', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto('/auth/login');
    
    // Login with test credentials
    await page.locator('#email').fill(USER_EMAIL);
    await page.locator('#password').fill(USER_PASSWORD);
    await page.getByRole('button', { name: /login/i }).click();
    
    // Wait for login to complete
    try {
      await Promise.race([
        page.waitForURL('**/dashboard**', { timeout: 5000 }),
        page.waitForURL('**/profile**', { timeout: 5000 }),
        page.waitForURL('**/home**', { timeout: 5000 })
      ]);
    } catch (e) {
      // Fallback check for login success
      const isLoggedIn = await page
        .getByTestId('user-avatar')
        .or(page.getByRole('button', { name: /account|profile/i }))
        .isVisible()
        .catch(() => false);
      
      if (!isLoggedIn) {
        test.fail(true, 'Login failed, unable to proceed with subscription tests');
      }
    }
  });

  test('User can view subscription plans', async ({ page }) => {
    // Navigate to subscription plans page
    await page.goto(PLANS_URL);
    
    // Check for presence of plan options
    await expect(page.getByRole('heading', { name: /subscription plans/i })).toBeVisible();
    
    // Verify multiple plans are displayed
    const planCards = page.locator('.plan-card').or(page.locator('[data-testid="plan-card"]'));
    expect(await planCards.count()).toBeGreaterThanOrEqual(1);
    
    // Check for plan details
    await expect(page.getByText(/free/i)).toBeVisible();
    await expect(page.getByText(/premium/i)).toBeVisible();
    
    // Verify plan price information is visible
    await expect(page.getByText(/month/i).or(page.getByText(/year/i))).toBeVisible();
  });

  test('User can navigate to checkout for premium plan', async ({ page }) => {
    // Navigate to subscription plans page
    await page.goto(PLANS_URL);
    
    // Find and click the premium plan's subscribe/upgrade button
    await page.getByRole('button', { name: /subscribe|upgrade|get premium/i })
      .or(page.locator('[data-testid="premium-subscribe-button"]'))
      .click();
    
    // Verify redirection to checkout or payment page
    // This could redirect to Stripe or an internal checkout page
    await expect(page.url()).toContain('/checkout');
    
    // If using Stripe, it might redirect to their domain
    // In that case, we'd check for Stripe elements
    const stripeElements = page.locator('#payment-element')
      .or(page.locator('[data-stripe-element]'))
      .or(page.locator('iframe[src*="stripe.com"]'));
      
    const internalCheckout = page.getByText(/payment details/i)
      .or(page.getByRole('heading', { name: /checkout/i }));
      
    // Check if either Stripe elements or internal checkout is visible
    const checkoutVisible = await Promise.race([
      stripeElements.isVisible().catch(() => false),
      internalCheckout.isVisible().catch(() => false)
    ]);
    
    expect(checkoutVisible).toBeTruthy();
  });

  test('User can access subscription management portal', async ({ page }) => {
    // Navigate to subscription page
    await page.goto(SUBSCRIPTION_URL);
    
    // Click on manage subscription button
    await page.getByRole('button', { name: /manage subscription/i })
      .or(page.getByText(/manage subscription/i))
      .click();
    
    // Check if redirected to portal or management page
    await expect(page.url()).toContain('subscription/manage');
    
    // Verify subscription management elements are present
    await expect(page.getByText(/current plan/i).or(page.getByText(/subscription details/i))).toBeVisible();
    
    // Check for cancel subscription option
    await expect(page.getByRole('button', { name: /cancel subscription/i })
      .or(page.getByText(/cancel subscription/i))).toBeVisible();
  });

  test('User can view their subscription status', async ({ page }) => {
    // Navigate to subscription page
    await page.goto(SUBSCRIPTION_URL);
    
    // Check for subscription status elements
    await expect(page.getByText(/subscription status/i)).toBeVisible();
    
    // Status could be one of several values
    const statusText = await page.getByText(/active|inactive|cancelled|pending/i).textContent();
    expect(statusText).toBeTruthy();
    
    // Check for plan information
    await expect(page.getByText(/plan details/i).or(page.getByText(/current plan/i))).toBeVisible();
    
    // Check for renewal date or expiration date if subscribed
    const dateInfo = await page.getByText(/renews on|expires on|started on/i).isVisible();
    expect(dateInfo || await page.getByText(/no active subscription/i).isVisible()).toBeTruthy();
  });
});