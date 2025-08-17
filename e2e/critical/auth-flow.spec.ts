import { test, expect } from '@playwright/test';

test.describe('Critical Authentication Flow', () => {
  test('login page loads correctly', async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for essential elements
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign in"), button:has-text("Login")')).toBeVisible();
    
    // Check page title
    const title = await page.title();
    expect(title).toContain('User Management');
  });

  test('registration page loads correctly', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/auth/register');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for essential elements
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    
    // Check for registration-specific elements
    const submitButton = page.locator('button:has-text("Sign up"), button:has-text("Register"), button:has-text("Create account")');
    await expect(submitButton).toBeVisible();
  });

  test('password reset page loads correctly', async ({ page }) => {
    // Navigate to password reset page
    await page.goto('/auth/reset-password');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for essential elements
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    
    // Check for reset button
    const resetButton = page.locator('button:has-text("Reset"), button:has-text("Send reset email")');
    await expect(resetButton).toBeVisible();
  });

  test('protected route redirects to login', async ({ page }) => {
    // Try to access a protected route
    await page.goto('/account/profile');
    
    // Wait for redirect
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to login page
    const url = page.url();
    expect(url).toContain('/auth/login');
  });
});

test.describe('Critical Dashboard Access', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if page loaded successfully
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title).toContain('User Management');
  });

  test('settings page structure', async ({ page }) => {
    // Try to access settings (might redirect if not authenticated)
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    // Either on settings page or redirected to login
    expect(url).toMatch(/\/(settings|auth\/login)/);
  });
});

test.describe('Critical API Health Checks', () => {
  test('health endpoint responds', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBeLessThan(500); // Not a server error
  });

  test('ping endpoint responds', async ({ request }) => {
    const response = await request.get('/api/ping');
    expect(response.status()).toBeLessThan(500); // Not a server error
  });
});