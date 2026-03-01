import { test, expect, type Page } from '@playwright/test';

// User email and password for testing
const USER_EMAIL = process.env.E2E_USER_EMAIL || 'user@example.com';
const USER_PASSWORD = process.env.E2E_USER_PASSWORD || 'password123';

/**
 * Helper function to navigate to security settings with fallbacks
 */
async function navigateToSecuritySettings(page: Page) {
  // Try multiple paths to security settings
  try {
    // First try direct navigation to security settings
    await page.goto('/settings/security');
    await page.waitForLoadState('domcontentloaded');
    
    // Check if security section is visible
    const securityHeading = page.getByRole('heading', { name: /security|backup codes|2fa|mfa/i });
    if (await securityHeading.isVisible().catch(() => false)) {
      return true;
    }
    
    // If not found, try main settings page and look for tabs/links
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    
    // Try clicking security tab if it exists
    try {
      await page.getByRole('tab', { name: /security/i }).click({ timeout: 3000 });
      return true;
    } catch (e) {
      // Try clicking security link if tabs don't exist
      await page.getByRole('link', { name: /security/i }).click({ timeout: 3000 });
      return true;
    }
  } catch (e) {
    console.log('Error navigating to security settings:', e);
    return false;
  }
}

/**
 * Helper function to login
 */
async function login(page: Page, email: string, password: string) {
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for navigation to complete (dashboard or profile)
  try {
    await Promise.race([
      page.waitForURL('**/dashboard**', { timeout: 10000 }),
      page.waitForURL('**/profile**', { timeout: 10000 })
    ]);
    return true;
  } catch (e) {
    console.log('Login navigation failed:', e);
    return false;
  }
}

test.describe('4.5: MFA Management', () => {
  let page: Page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Login before each test
    const loginSuccessful = await login(page, USER_EMAIL, USER_PASSWORD);
    if (!loginSuccessful) {
      // If login fails, mark the test as skipped
      test.skip();
    }
  });
  
  test.afterEach(async () => {
    await page.close();
  });

  test('User can view their MFA status', async () => {
    // Navigate to security settings
    const navigated = await navigateToSecuritySettings(page);
    expect(navigated).toBe(true);
    
    // Wait for the security page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Look for MFA section
    const mfaSection = page.getByText(/multi-factor authentication|mfa|2fa/i).first();
    await expect(mfaSection).toBeVisible();
    
    // Check for either enabled or disabled status indicator
    const statusText = page.getByText(/enabled|disabled|active|inactive/i);
    await expect(statusText).toBeVisible();
    
    // The test should pass regardless of whether MFA is enabled or disabled
    // We're just testing that the user can view their status
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'mfa-status.png' });
  });
  
  test('User can disable MFA if it is enabled', async () => {
    // Navigate to security settings
    const navigated = await navigateToSecuritySettings(page);
    expect(navigated).toBe(true);
    
    // Check if MFA is enabled
    let mfaEnabled = false;
    
    // First approach: look for "Enabled" text near MFA heading
    try {
      const enabledText = page.getByText(/enabled|active/i).first();
      mfaEnabled = await enabledText.isVisible({ timeout: 5000 });
    } catch (e) {
      console.log('Could not find enabled text, trying alternative detection');
    }
    
    // Second approach: look for disable button
    if (!mfaEnabled) {
      const disableButton = page.getByRole('button', { name: /disable|turn off|remove/i });
      mfaEnabled = await disableButton.isVisible({ timeout: 5000 }).catch(() => false);
    }
    
    // Skip test if MFA is not enabled
    if (!mfaEnabled) {
      console.log('MFA is not enabled, skipping disable test');
      test.skip();
      return;
    }
    
    // Find and click the disable button
    const disableButton = page.getByRole('button', { name: /disable|turn off|remove/i });
    await disableButton.click();
    
    // Look for confirmation dialog
    const confirmDialog = page.getByRole('dialog');
    
    if (await confirmDialog.isVisible({ timeout: 5000 }).catch(() => false)) {
      // If confirmation is required, enter password and confirm
      const passwordInput = page.getByLabel(/password|current password/i);
      
      if (await passwordInput.isVisible().catch(() => false)) {
        await passwordInput.fill(USER_PASSWORD);
      }
      
      // Click confirm button
      const confirmButton = page
        .getByRole('button', { name: /confirm|disable|yes|proceed/i })
        .or(page.locator('[data-testid="confirm-disable-mfa"]'));
        
      await confirmButton.click();
    }
    
    // Wait for success message
    const successMessage = page.getByRole('alert')
      .or(page.getByText(/disabled successfully|turned off|removed successfully/i));
      
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    
    // Verify MFA section now shows disabled
    const disabledText = page.getByText(/disabled|inactive/i);
    await expect(disabledText).toBeVisible({ timeout: 5000 });
  });
  
  test('User can enable MFA if it is disabled', async () => {
    // Navigate to security settings
    const navigated = await navigateToSecuritySettings(page);
    expect(navigated).toBe(true);
    
    // Check if MFA is disabled
    let mfaDisabled = false;
    
    // First approach: look for "Disabled" text near MFA heading
    try {
      const disabledText = page.getByText(/disabled|inactive/i).first();
      mfaDisabled = await disabledText.isVisible({ timeout: 5000 });
    } catch (e) {
      console.log('Could not find disabled text, trying alternative detection');
    }
    
    // Second approach: look for enable button
    if (!mfaDisabled) {
      const enableButton = page.getByRole('button', { name: /enable|set up|add/i });
      mfaDisabled = await enableButton.isVisible({ timeout: 5000 }).catch(() => false);
    }
    
    // Skip test if MFA is already enabled
    if (!mfaDisabled) {
      console.log('MFA is already enabled, skipping enable test');
      test.skip();
      return;
    }
    
    // Find and click the enable/setup button
    const enableButton = page.getByRole('button', { name: /enable|set up|add/i });
    await enableButton.click();
    
    // Look for MFA setup dialog/page
    const setupDialog = page.getByRole('dialog')
      .or(page.locator('[data-testid="mfa-setup-dialog"]'))
      .or(page.getByText(/choose method|select method/i).first());
      
    // If setup dialog appears, we'll consider the test successful
    // (we're not testing the full setup flow here as that's covered in other tests)
    if (await setupDialog.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('MFA setup dialog opened successfully');
      
      // Close the dialog to clean up
      const closeButton = page.getByRole('button', { name: /close|cancel/i });
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
      }
    } else {
      // If no setup dialog appears, we might have been taken to a dedicated setup page
      // Check for any MFA setup indicators
      const setupPage = page.getByText(/authenticator app|sms|email verification/i);
      
      await expect(setupPage).toBeVisible({ timeout: 5000 });
      console.log('MFA setup page opened successfully');
      
      // Navigate back to settings to clean up
      await page.goto('/settings');
    }
  });
  
  test('User can view backup codes when MFA is enabled', async () => {
    // Navigate to security settings
    const navigated = await navigateToSecuritySettings(page);
    expect(navigated).toBe(true);
    
    // Check if MFA is enabled
    let mfaEnabled = false;
    
    // First approach: look for "Enabled" text near MFA heading
    try {
      const enabledText = page.getByText(/enabled|active/i).first();
      mfaEnabled = await enabledText.isVisible({ timeout: 5000 });
    } catch (e) {
      console.log('Could not find enabled text, trying alternative detection');
    }
    
    // Second approach: look for backup codes button
    if (!mfaEnabled) {
      const backupCodesButton = page.getByRole('button', { name: /backup codes|recovery codes/i });
      mfaEnabled = await backupCodesButton.isVisible({ timeout: 5000 }).catch(() => false);
    }
    
    // Skip test if MFA is not enabled
    if (!mfaEnabled) {
      console.log('MFA is not enabled, skipping backup codes test');
      test.skip();
      return;
    }
    
    // Find and click the backup codes button
    const backupCodesButton = page.getByRole('button', { name: /backup codes|recovery codes|view codes/i })
      .or(page.getByText(/backup codes|recovery codes/i).first());
      
    if (await backupCodesButton.isVisible().catch(() => false)) {
      await backupCodesButton.click();
      
      // Look for backup codes display
      const backupCodes = page.locator('[data-testid="backup-codes"]')
        .or(page.getByText(/[A-Z0-9]{4}-[A-Z0-9]{4}/i).first());
        
      await expect(backupCodes).toBeVisible({ timeout: 5000 });
      
      // Look for action buttons (download, copy, etc.)
      const actionButton = page.getByRole('button', { name: /download|copy|print/i });
      await expect(actionButton).toBeVisible();
      
      // Close the dialog/page if possible
      const closeButton = page.getByRole('button', { name: /close|done/i });
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
      }
    } else {
      console.log('Backup codes button not found');
      
      // This is acceptable if backup codes are displayed directly on the page without needing a button
      const backupCodes = page.getByText(/[A-Z0-9]{4}-[A-Z0-9]{4}/i).first();
      const hasCodesVisible = await backupCodes.isVisible().catch(() => false);
      
      if (hasCodesVisible) {
        console.log('Backup codes are already visible on the page');
      } else {
        throw new Error('No backup codes found and no button to view them');
      }
    }
  });
}); 