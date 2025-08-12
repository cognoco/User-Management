import { test } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Log environment details
test.beforeAll(() => {
  console.log('==== Login Debug Test ====');
  console.log(`NEXT_PUBLIC_SUPABASE_URL exists: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'YES' : 'NO'}`);
  console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY exists: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'YES' : 'NO'}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY exists: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'YES' : 'NO'}`);
  console.log(`E2E_ADMIN_EMAIL: ${process.env.E2E_ADMIN_EMAIL || 'admin@example.com'}`);
  console.log(`E2E_USER_EMAIL: ${process.env.E2E_USER_EMAIL || 'user@example.com'}`);
});

// Constants for test credentials
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'adminpassword';

test('Debug admin login process', async ({ page }) => {
  // Go to login page
  console.log('Navigating to login page...');
  await page.goto('/auth/login');
  
  // Log URL to verify we're on the right page
  console.log(`Current URL: ${page.url()}`);
  
  // Wait for form to be visible
  console.log('Waiting for login form...');
  await page.waitForSelector('form', { state: 'visible', timeout: 10000 });
  console.log('Login form found');
  
  // Check form elements
  const emailInput = page.locator('#email');
  const passwordInput = page.locator('#password');
  const submitButton = page.getByRole('button', { name: /login/i });
  
  console.log(`Email input exists: ${await emailInput.count() > 0 ? 'YES' : 'NO'}`);
  console.log(`Password input exists: ${await passwordInput.count() > 0 ? 'YES' : 'NO'}`);
  console.log(`Submit button exists: ${await submitButton.count() > 0 ? 'YES' : 'NO'}`);
  
  // Fill out the form
  console.log(`Filling email: ${ADMIN_EMAIL}`);
  await emailInput.fill(ADMIN_EMAIL);
  
  console.log(`Filling password: ${ADMIN_PASSWORD}`);
  await passwordInput.fill(ADMIN_PASSWORD);
  
  // Take a screenshot before submitting
  await page.screenshot({ path: 'login-debug-before-submit.png' });
  
  // Submit the form
  console.log('Clicking submit button');
  await submitButton.click();
  
  // Wait for response
  console.log('Waiting for response...');
  await page.waitForTimeout(2000);
  
  // Take a screenshot after submitting
  await page.screenshot({ path: 'login-debug-after-submit.png' });
  
  // Check for error message
  const errorAlert = page.locator('[role="alert"]');
  if (await errorAlert.count() > 0) {
    const isVisible = await errorAlert.isVisible();
    console.log(`Error alert is visible: ${isVisible ? 'YES' : 'NO'}`);
    
    if (isVisible) {
      const errorText = await errorAlert.textContent();
      console.log(`Error message: ${errorText || 'No text content'}`);
    }
  } else {
    console.log('No error alert found');
  }
  
  // Check current URL
  console.log(`After login URL: ${page.url()}`);
  
  // Look for user menu (sign of successful login)
  const userMenu = page.locator('[aria-label="User menu"]');
  if (await userMenu.count() > 0) {
    const isVisible = await userMenu.isVisible();
    console.log(`User menu found and visible: ${isVisible ? 'YES' : 'NO'}`);
  } else {
    console.log('User menu not found');
  }
  
  // Try to find any element that might indicate successful login
  const possibleSuccessElements = [
    page.locator('header button:has([aria-label="User menu"])'),
    page.locator('nav:has-text("Dashboard")'),
    page.locator('[aria-label="user-avatar"]'),
    page.locator('button:has-text("Logout")'),
    page.locator('h1:has-text("Dashboard")')
  ];
  
  let foundSuccessIndicator = false;
  for (const element of possibleSuccessElements) {
    if (await element.count() > 0 && await element.isVisible()) {
      console.log(`Found success indicator: ${await element.evaluate(el => el.outerHTML)}`);
      foundSuccessIndicator = true;
      break;
    }
  }
  
  if (!foundSuccessIndicator) {
    console.log('No success indicators found - login likely failed');
    
    // Check page content for clues
    const bodyText = await page.locator('body').textContent();
    console.log(`Body text first 200 chars: ${bodyText?.substring(0, 200)}`);
  }
}); 