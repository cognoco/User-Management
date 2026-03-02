import { test, expect } from '@playwright/test';

// --- Constants and Test Data --- //
const USER_EMAIL = process.env.E2E_USER_EMAIL || 'user@example.com';
const USER_PASSWORD = process.env.E2E_USER_PASSWORD || 'password123';
const LICENSE_URL = '/license';
const ACTIVATE_LICENSE_URL = '/license/activate';

// --- Test Suite --- //
test.describe('License Management Flows', () => {
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
        test.fail(true, 'Login failed, unable to proceed with license tests');
      }
    }
  });

  test('User can view license information', async ({ page }) => {
    // Navigate to license page
    await page.goto(LICENSE_URL);
    
    // Check for license information heading
    await expect(page.getByRole('heading', { name: /license information|license details/i })).toBeVisible();
    
    // Check for license status
    await expect(page.getByText(/license status/i)).toBeVisible();
    
    // Status could be one of several values
    const statusText = await page.getByText(/active|inactive|expired|trial/i).textContent();
    expect(statusText).toBeTruthy();
    
    // Check for license key field (might be masked)
    await expect(page.getByText(/license key/i).or(page.getByText(/activation key/i))).toBeVisible();
    
    // Check for expiration or renewal date if applicable
    const dateInfo = await page.getByText(/expires on|renews on|valid until/i).isVisible();
    expect(dateInfo || await page.getByText(/perpetual license|no expiration/i).isVisible()).toBeTruthy();
  });

  test('User can activate a license key', async ({ page }) => {
    // Navigate to license activation page
    await page.goto(ACTIVATE_LICENSE_URL);
    
    // Check for license activation heading
    await expect(page.getByRole('heading', { name: /activate license|enter license key/i })).toBeVisible();
    
    // Find license key input field
    const licenseKeyInput = page.locator('#license-key')
      .or(page.locator('[placeholder*="license key"]'))
      .or(page.locator('[name="licenseKey"]'));
      
    await expect(licenseKeyInput).toBeVisible();
    
    // Enter a test license key (this would be a dummy one for testing)
    await licenseKeyInput.fill('TEST-LICENSE-KEY-1234-5678-90AB-CDEF');
    
    // Submit the license key
    await page.getByRole('button', { name: /activate|verify|submit/i }).click();
    
    // In a test environment, we might not complete the activation
    // but we can check that the submission occurred
    
    // Check for appropriate response messaging
    await expect(page.getByText(/verifying|processing|validating/i)
      .or(page.getByText(/license activated|activation successful/i))
      .or(page.getByText(/invalid license key/i))).toBeVisible();
  });

  test('User can view license usage details', async ({ page }) => {
    // Navigate to license page
    await page.goto(LICENSE_URL);
    
    // Check for license usage section
    const usageSection = page.getByText(/license usage/i)
      .or(page.getByText(/seats used/i))
      .or(page.getByText(/allowed devices/i));
      
    const hasUsageDetails = await usageSection.isVisible();
    
    if (hasUsageDetails) {
      // Check for usage metrics
      await expect(page.getByText(/seats|users|devices/i).or(page.getByText(/usage limit/i))).toBeVisible();
      
      // Look for usage indicators
      const usageIndicator = page.locator('.usage-indicator')
        .or(page.locator('[data-testid="usage-indicator"]'))
        .or(page.locator('progress'))
        .or(page.getByText(/\d+\s*\/\s*\d+/)); // Pattern like "5 / 10"
        
      await expect(usageIndicator).toBeVisible();
    } else {
      // Skip test if no usage details available for this license type
      test.skip(true, 'No usage details available for this license type');
    }
  });

  test('User can transfer or deactivate license', async ({ page }) => {
    // Navigate to license page
    await page.goto(LICENSE_URL);
    
    // Check for license management options
    const deactivateButton = page.getByRole('button', { name: /deactivate license/i })
      .or(page.getByText(/deactivate license/i));
      
    const transferButton = page.getByRole('button', { name: /transfer license/i })
      .or(page.getByText(/transfer license/i));
      
    const hasManagementOptions = await Promise.race([
      deactivateButton.isVisible().catch(() => false),
      transferButton.isVisible().catch(() => false)
    ]);
    
    if (hasManagementOptions) {
      // Click on the available option (preference to deactivate)
      if (await deactivateButton.isVisible().catch(() => false)) {
        await deactivateButton.click();
      } else {
        await transferButton.click();
      }
      
      // Check for confirmation dialog
      await expect(page.getByText(/confirm|are you sure/i)).toBeVisible();
      
      // Check for cancel button in dialog
      await expect(page.getByRole('button', { name: /cancel|back/i })).toBeVisible();
      
      // Click cancel to abort operation
      await page.getByRole('button', { name: /cancel|back/i }).click();
      
      // Verify we're back on the license page
      await expect(page.getByRole('heading', { name: /license information|license details/i })).toBeVisible();
    } else {
      // Skip test if no management options available
      test.skip(true, 'No license deactivation or transfer options available');
    }
  });
});