import { test, expect } from '@playwright/test';

test.describe('Phase 1: Login Test', () => {
  test('should successfully login with valid credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
    
    // Wait for the form to be visible
    await page.waitForSelector('form', { timeout: 30000 });
    
    // Fill in the login form
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    
    // Click the submit button
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete or error message
    const response = await page.waitForResponse((response) => 
      response.url().includes('/api/auth/login'), 
      { timeout: 30000 }
    );
    
    // Check if login was successful
    expect(response.status()).toBe(200);
    
    // Verify we're redirected to dashboard
    await page.waitForURL('**/dashboard/**', { timeout: 30000 });
  });
  
  test('should show error with invalid credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
    
    // Wait for the form to be visible
    await page.waitForSelector('form', { timeout: 30000 });
    
    // Fill in the login form with invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'WrongPassword');
    
    // Click the submit button
    await page.click('button[type="submit"]');
    
    // Wait for API response
    const response = await page.waitForResponse((response) => 
      response.url().includes('/api/auth/login'), 
      { timeout: 30000 }
    );
    
    // Check that login failed
    expect(response.status()).toBe(401);
    
    // Check for error message
    await expect(page.locator('text=/invalid|incorrect|failed/i')).toBeVisible({ timeout: 5000 });
  });
});