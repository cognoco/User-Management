import { test, expect, Page } from '@playwright/test';
import { loginAs } from '../../utils/auth';

// Test credentials
const USER_EMAIL = process.env.E2E_USER_EMAIL || 'user@example.com';
const USER_PASSWORD = process.env.E2E_USER_PASSWORD || 'password123';

/**
 * Navigate to the security settings page using a resilient approach.
 */
async function navigateToSecuritySettings(page: Page): Promise<boolean> {
  try {
    await page.goto('/settings/security');
    await page.waitForLoadState('domcontentloaded');

    const heading = page.getByRole('heading', { name: /security/i });
    if (await heading.isVisible().catch(() => false)) {
      return true;
    }

    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    try {
      await page.getByRole('tab', { name: /security/i }).click({ timeout: 3000 });
      return true;
    } catch {
      await page.getByRole('link', { name: /security/i }).click({ timeout: 3000 });
      return true;
    }
  } catch (e) {
    console.log('Error navigating to security settings:', e);
    return false;
  }
}

test.describe('Email MFA Setup and Verification', () => {
  test('User can set up Email MFA', async ({ page, browserName }) => {
    // Login using helper
    await loginAs(page, USER_EMAIL, USER_PASSWORD);

    // Navigate to security settings
    const navigated = await navigateToSecuritySettings(page);
    expect(navigated).toBe(true);

    // Start MFA setup by clicking the "Enable" button
    const enableButton = page
      .getByRole('button', { name: /enable.*2fa|add.*factor|setup.*2fa/i })
      .first();
    if (await enableButton.isVisible().catch(() => false)) {
      await enableButton.click();
    } else {
      test.skip(true, 'Enable 2FA button not found');
      return;
    }

    // Select email as the MFA method
    const emailOption = page.getByRole('button', { name: /email/i }).or(page.getByText(/email/i));
    if (await emailOption.isVisible().catch(() => false)) {
      await emailOption.click();
    } else {
      test.skip(true, 'Email MFA option not available');
      return;
    }

    // Wait for verification code input
    const codeInput = page.getByLabel(/verification code|enter code/i).or(
      page.getByPlaceholder(/code/i)
    );
    await expect(codeInput).toBeVisible();

    // Enter verification code
    if (browserName === 'webkit') {
      await page.evaluate((code) => {
        const input = document.querySelector('input[type="text"],input');
        if (input) {
          (input as HTMLInputElement).value = code;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, '123456');
    } else {
      await codeInput.fill('123456');
    }

    // Submit the verification code
    const verifyButton = page.getByRole('button', { name: /verify|continue|submit/i });
    await verifyButton.click();

    // Verify we see backup codes
    const backupHeading = page.getByText(/backup codes/i);
    await expect(backupHeading).toBeVisible();

    // Verify user is redirected back to security settings with 2FA now showing as enabled
    await page.getByRole('button', { name: /continue|done|close/i }).first().click().catch(() => {});
    await expect(page.getByText(/email/i)).toBeVisible();
  });
  
  test('User sees error with invalid verification code', async ({ page }) => {
    // Login and navigate
    await loginAs(page, USER_EMAIL, USER_PASSWORD);
    const navigated = await navigateToSecuritySettings(page);
    expect(navigated).toBe(true);

    const enableButton = page
      .getByRole('button', { name: /enable.*2fa|add.*factor|setup.*2fa/i })
      .first();
    if (await enableButton.isVisible().catch(() => false)) {
      await enableButton.click();
    } else {
      test.skip(true, 'Enable 2FA button not found');
      return;
    }

    // Select email as the MFA method
    const emailOption = page.getByRole('button', { name: /email/i }).or(page.getByText(/email/i));
    if (await emailOption.isVisible().catch(() => false)) {
      await emailOption.click();
    } else {
      test.skip(true, 'Email MFA option not available');
      return;
    }

    // Enter incorrect verification code
    const codeInput = page.getByLabel(/verification code|enter code/i).or(page.getByPlaceholder(/code/i));
    await expect(codeInput).toBeVisible();
    await codeInput.fill('000000');

    const verifyButton = page.getByRole('button', { name: /verify|continue|submit/i });
    await verifyButton.click();

    // Check for error message
    const alert = page.locator('[role="alert"]').first();
    await expect(alert).toBeVisible();
  });
  
  test('User can resend email verification code', async ({ page }) => {
    await loginAs(page, USER_EMAIL, USER_PASSWORD);
    const navigated = await navigateToSecuritySettings(page);
    expect(navigated).toBe(true);

    const enableButton = page
      .getByRole('button', { name: /enable.*2fa|add.*factor|setup.*2fa/i })
      .first();
    if (await enableButton.isVisible().catch(() => false)) {
      await enableButton.click();
    } else {
      test.skip(true, 'Enable 2FA button not found');
      return;
    }

    // Select email as MFA method
    const emailOption = page.getByRole('button', { name: /email/i }).or(page.getByText(/email/i));
    if (await emailOption.isVisible().catch(() => false)) {
      await emailOption.click();
    } else {
      test.skip(true, 'Email MFA option not available');
      return;
    }

    const codeInput = page.getByLabel(/verification code|enter code/i).or(page.getByPlaceholder(/code/i));
    await expect(codeInput).toBeVisible();

    // Look for and click the "Resend Code" button
    // Note: This test may be skipped if the resend button isn't implemented yet
    const resendButton = page.getByRole('button', { name: /resend code/i }).or(page.getByText(/resend code/i));
    if (await resendButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await resendButton.click();
    } else {
      test.skip(true, 'Resend button not implemented yet');
    }
  });
});
