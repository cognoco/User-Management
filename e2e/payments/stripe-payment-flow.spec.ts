import { test, expect } from '@playwright/test';

/**
 * E2E tests for Stripe payment integration
 * 
 * Note: These tests require a Stripe test environment to be configured.
 * They will be skipped if STRIPE_SECRET_KEY is not set.
 */

const STRIPE_TEST_ENABLED = !!process.env.STRIPE_SECRET_KEY;

test.describe.skipIf(!STRIPE_TEST_ENABLED, 'Stripe Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Create a test user and login
    await page.goto('/auth/register');
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for registration to complete
    await page.waitForURL(/\/(dashboard|account)/);
  });

  test('should complete checkout flow', async ({ page }) => {
    // Navigate to subscription page
    await page.goto('/settings/subscription');
    
    // Click on a pricing plan
    await page.click('[data-testid="plan-premium"]');
    
    // Should redirect to Stripe checkout
    await page.waitForURL(/checkout\.stripe\.com/);
    
    // Fill in test card details (Stripe test mode)
    await page.fill('[placeholder*="Card number"]', '4242424242424242');
    await page.fill('[placeholder*="MM / YY"]', '12/30');
    await page.fill('[placeholder*="CVC"]', '123');
    await page.fill('[placeholder*="ZIP"]', '12345');
    
    // Complete the purchase
    await page.click('button[type="submit"]');
    
    // Should redirect back to success page
    await page.waitForURL(/\/settings\/subscription\?success=true/);
    
    // Verify subscription is active
    await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Active');
  });

  test('should display invoice history', async ({ page }) => {
    // Navigate to billing page
    await page.goto('/account/billing');
    
    // Check if invoice history section exists
    await expect(page.locator('[data-testid="invoice-history"]')).toBeVisible();
    
    // If user has invoices, they should be displayed
    const invoiceRows = page.locator('[data-testid="invoice-row"]');
    const count = await invoiceRows.count();
    
    if (count > 0) {
      // Verify invoice details are shown
      const firstInvoice = invoiceRows.first();
      await expect(firstInvoice.locator('[data-testid="invoice-amount"]')).toBeVisible();
      await expect(firstInvoice.locator('[data-testid="invoice-status"]')).toBeVisible();
      await expect(firstInvoice.locator('[data-testid="invoice-date"]')).toBeVisible();
      
      // Test PDF download
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        firstInvoice.locator('[data-testid="download-pdf"]').click(),
      ]);
      
      expect(download.suggestedFilename()).toContain('.pdf');
    }
  });

  test('should manage payment methods', async ({ page }) => {
    // Navigate to payment methods page
    await page.goto('/settings/payment-methods');
    
    // Add a new payment method
    await page.click('[data-testid="add-payment-method"]');
    
    // Fill in card details
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/30');
    await page.fill('[data-testid="card-cvc"]', '123');
    
    // Save the payment method
    await page.click('[data-testid="save-payment-method"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Payment method added');
    
    // Verify the card appears in the list
    await expect(page.locator('[data-testid="payment-method-4242"]')).toBeVisible();
    
    // Test setting as default
    await page.click('[data-testid="set-default-4242"]');
    await expect(page.locator('[data-testid="default-badge-4242"]')).toBeVisible();
    
    // Test removing payment method
    await page.click('[data-testid="remove-4242"]');
    await page.click('[data-testid="confirm-remove"]');
    await expect(page.locator('[data-testid="payment-method-4242"]')).not.toBeVisible();
  });

  test('should handle subscription cancellation', async ({ page }) => {
    // Navigate to subscription page
    await page.goto('/settings/subscription');
    
    // Click cancel subscription
    await page.click('[data-testid="cancel-subscription"]');
    
    // Confirm cancellation
    await page.click('[data-testid="confirm-cancel"]');
    
    // Verify cancellation status
    await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Canceling');
    await expect(page.locator('[data-testid="cancel-date"]')).toBeVisible();
    
    // Test resume subscription
    await page.click('[data-testid="resume-subscription"]');
    await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Active');
  });

  test('should access customer portal', async ({ page }) => {
    // Navigate to billing settings
    await page.goto('/settings/billing');
    
    // Click on customer portal link
    await page.click('[data-testid="customer-portal"]');
    
    // Should redirect to Stripe customer portal
    await page.waitForURL(/billing\.stripe\.com/);
    
    // Verify portal loaded
    await expect(page.locator('text=Customer portal')).toBeVisible();
  });

  test('should handle payment failures gracefully', async ({ page }) => {
    // Navigate to subscription page
    await page.goto('/settings/subscription');
    
    // Click on a pricing plan
    await page.click('[data-testid="plan-premium"]');
    
    // Wait for Stripe checkout
    await page.waitForURL(/checkout\.stripe\.com/);
    
    // Use a card that will be declined
    await page.fill('[placeholder*="Card number"]', '4000000000000002'); // Stripe test card that always declines
    await page.fill('[placeholder*="MM / YY"]', '12/30');
    await page.fill('[placeholder*="CVC"]', '123');
    await page.fill('[placeholder*="ZIP"]', '12345');
    
    // Try to complete the purchase
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Your card was declined')).toBeVisible();
  });

  test('should display subscription details', async ({ page }) => {
    // Navigate to subscription page
    await page.goto('/settings/subscription');
    
    // Check if subscription details are displayed
    const hasSubscription = await page.locator('[data-testid="subscription-details"]').isVisible();
    
    if (hasSubscription) {
      // Verify subscription information is shown
      await expect(page.locator('[data-testid="plan-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="billing-period"]')).toBeVisible();
      await expect(page.locator('[data-testid="next-payment"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-amount"]')).toBeVisible();
      
      // Verify action buttons are available
      await expect(page.locator('[data-testid="update-plan"]')).toBeVisible();
      await expect(page.locator('[data-testid="cancel-subscription"]')).toBeVisible();
    } else {
      // Verify call-to-action for new subscription
      await expect(page.locator('[data-testid="subscribe-cta"]')).toBeVisible();
    }
  });

  test('should handle webhook events', async ({ page, request }) => {
    // This test simulates webhook events
    // Note: In real scenario, this would be triggered by Stripe
    
    const webhookPayload = {
      id: 'evt_test',
      object: 'event',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_test',
          customer: 'cus_test',
          status: 'active',
          metadata: {
            userId: 'user_123',
          },
        },
      },
    };
    
    // Send webhook (would normally come from Stripe)
    const response = await request.post('/api/webhooks/stripe', {
      data: webhookPayload,
      headers: {
        'stripe-signature': 'test_signature', // Would be real signature from Stripe
      },
    });
    
    // Webhook should be processed successfully
    expect(response.ok()).toBeTruthy();
    
    // Navigate to subscription page to verify update
    await page.goto('/settings/subscription');
    
    // Subscription should be reflected as active
    await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Active');
  });
});

// Mobile-specific tests
test.describe.skipIf(!STRIPE_TEST_ENABLED, 'Mobile Payment Flow', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should complete checkout on mobile', async ({ page }) => {
    // Login first
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Navigate to subscription page
    await page.goto('/settings/subscription');
    
    // Mobile menu might be collapsed
    const menuButton = page.locator('[data-testid="mobile-menu"]');
    if (await menuButton.isVisible()) {
      await menuButton.click();
    }
    
    // Click on a pricing plan
    await page.click('[data-testid="plan-premium"]');
    
    // Should redirect to Stripe checkout (mobile optimized)
    await page.waitForURL(/checkout\.stripe\.com/);
    
    // Verify mobile-optimized checkout is displayed
    await expect(page.locator('.MobileCheckout')).toBeVisible();
  });
});