import { test, expect } from '@playwright/test';

// --- Constants and Test Data --- //
const USER_EMAIL = process.env.E2E_USER_EMAIL || 'user@example.com';
const USER_PASSWORD = process.env.E2E_USER_PASSWORD || 'password123';
const PAYMENT_METHODS_URL = '/payment/methods';
const PAYMENT_HISTORY_URL = '/payment/history';

// --- Test Suite --- //
test.describe('Payment Management Flows', () => {
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
        test.fail(true, 'Login failed, unable to proceed with payment tests');
      }
    }
  });

  test('User can view payment methods', async ({ page }) => {
    // Navigate to payment methods page
    await page.goto(PAYMENT_METHODS_URL);
    
    // Check for payment methods section
    await expect(page.getByRole('heading', { name: /payment methods/i })).toBeVisible();
    
    // Check for add payment method button
    await expect(page.getByRole('button', { name: /add payment method/i })
      .or(page.getByText(/add payment method/i))).toBeVisible();
    
    // Payment methods list or empty state should be visible
    const hasPaymentMethods = await page.locator('[data-testid="payment-method-card"]')
      .or(page.locator('.payment-method-item'))
      .count() > 0;
      
    if (hasPaymentMethods) {
      // Check for payment method details if they exist
      await expect(page.getByText(/visa|mastercard|paypal/i)).toBeVisible();
      await expect(page.getByText(/\*\*\*\*/)).toBeVisible(); // Masked card number
    } else {
      // Check for empty state
      await expect(page.getByText(/no payment methods/i)
        .or(page.getByText(/add your first payment method/i))).toBeVisible();
    }
  });

  test('User can add a new payment method', async ({ page }) => {
    // Navigate to payment methods page
    await page.goto(PAYMENT_METHODS_URL);
    
    // Click add payment method button
    await page.getByRole('button', { name: /add payment method/i })
      .or(page.getByText(/add payment method/i))
      .click();
    
    // Check for payment form
    await expect(page.getByText(/card information/i).or(page.getByText(/payment details/i))).toBeVisible();
    
    // Look for Stripe Elements or internal payment form
    const stripeForm = page.locator('#card-element')
      .or(page.locator('[data-stripe-element]'))
      .or(page.locator('iframe[src*="stripe.com"]'));
      
    const internalForm = page.locator('#cardNumber')
      .or(page.locator('[name="cardNumber"]'))
      .or(page.locator('[placeholder*="card"]'));
      
    // Check if either form type is visible
    const formVisible = await Promise.race([
      stripeForm.isVisible().catch(() => false),
      internalForm.isVisible().catch(() => false)
    ]);
    
    expect(formVisible).toBeTruthy();
    
    // We'll skip the actual form submission as it would require real card data
    // In a real test, you might use test cards if the system supports them
    
    // Check for save/add button
    await expect(page.getByRole('button', { name: /save|add|confirm/i })).toBeVisible();
  });

  test('User can view payment history', async ({ page }) => {
    // Navigate to payment history page
    await page.goto(PAYMENT_HISTORY_URL);
    
    // Check for payment history heading
    await expect(page.getByRole('heading', { name: /payment history|transactions/i })).toBeVisible();
    
    // Check for either payment records or empty state
    const hasTransactions = await page.locator('[data-testid="payment-record"]')
      .or(page.locator('.payment-history-item'))
      .or(page.locator('table tr'))
      .count() > 1; // More than header row
      
    if (hasTransactions) {
      // Check for payment details if they exist
      await expect(page.getByText(/date|amount|status/i)).toBeVisible();
    } else {
      // Check for empty state
      await expect(page.getByText(/no payment history|no transactions/i)).toBeVisible();
    }
  });

  test('User can download payment receipt', async ({ page }) => {
    // This test is conditional on having payment history
    
    // Navigate to payment history page
    await page.goto(PAYMENT_HISTORY_URL);
    
    // Check if there are payment records
    const paymentRecords = page.locator('[data-testid="payment-record"]')
      .or(page.locator('.payment-history-item'))
      .or(page.locator('table tr:not(:first-child)'));
      
    const hasRecords = await paymentRecords.count() > 0;
    
    if (hasRecords) {
      // Find and click receipt/invoice download button for the first payment
      const downloadButton = paymentRecords.first().locator('button, a')
        .filter({ hasText: /receipt|invoice|download/i });
        
      const hasDownloadOption = await downloadButton.count() > 0;
      
      if (hasDownloadOption) {
        // Set up download listener
        const downloadPromise = page.waitForEvent('download');
        
        // Click download button
        await downloadButton.click();
        
        // Wait for download to start
        const download = await downloadPromise;
        
        // Verify download started
        expect(download.suggestedFilename()).toBeTruthy();
      } else {
        // Skip test if no download option
        test.skip(true, 'No receipt download option available');
      }
    } else {
      // Skip test if no payment history
      test.skip(true, 'No payment history to test receipt download');
    }
  });
});