import { test, expect } from '@playwright/test';

test.describe('UI Integration Tests', () => {
  test('homepage displays all new features', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check that main features are displayed
    await expect(page.locator('text=Authentication')).toBeVisible();
    await expect(page.locator('text=Profile Management')).toBeVisible();
    await expect(page.locator('text=Privacy Controls')).toBeVisible();
    await expect(page.locator('text=Billing & Invoices')).toBeVisible();
    await expect(page.locator('text=Organizations')).toBeVisible();
    await expect(page.locator('text=Role-Based Access')).toBeVisible();
    
    // Check organization management section
    await expect(page.locator('text=Organization Management')).toBeVisible();
    await expect(page.locator('text=Domain Verification')).toBeVisible();
    await expect(page.locator('text=SSO Configuration')).toBeVisible();
    await expect(page.locator('text=Seat Management')).toBeVisible();
    
    // Check auth section
    await expect(page.locator('text=Authentication & Security')).toBeVisible();
    await expect(page.locator('text=Password Reset')).toBeVisible();
    await expect(page.locator('text=Email Verification')).toBeVisible();
    
    // Check implementation status
    await expect(page.locator('text=100%').first()).toBeVisible();
  });

  test('forgot password page loads correctly', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    
    await page.waitForLoadState('networkidle');
    
    // Check for password reset request form elements
    await expect(page.locator('h1:has-text("Forgot Password")')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button:has-text("Send Reset Email")')).toBeVisible();
    await expect(page.locator('text=Remember your password?')).toBeVisible();
  });

  test('privacy settings page requires authentication', async ({ page }) => {
    await page.goto('/account/privacy');
    
    // Should redirect to login since not authenticated
    await page.waitForURL(/auth\/login/);
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('organization pages require authentication', async ({ page }) => {
    await page.goto('/organizations/demo/settings');
    
    // Should redirect to login since not authenticated
    await page.waitForURL(/auth\/login/);
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('billing page requires authentication', async ({ page }) => {
    await page.goto('/account/billing');
    
    // Should redirect to login since not authenticated
    await page.waitForURL(/auth\/login/);
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('email verification page loads with proper messaging', async ({ page }) => {
    await page.goto('/auth/verify-email');
    
    await page.waitForLoadState('networkidle');
    
    // Should show verification UI
    const verifyingText = page.locator('text=Verifying Email');
    const resendButton = page.locator('button:has-text("Resend")');
    
    // At least one should be visible (either verifying or resend option)
    const hasVerifyingUI = await verifyingText.isVisible().catch(() => false) || 
                           await resendButton.isVisible().catch(() => false);
    
    expect(hasVerifyingUI).toBeTruthy();
  });
});