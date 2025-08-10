# Test info

- Name: Admin Dashboard >> should display admin dashboard for users with admin role
- Location: /workspaces/ZDX-UM/user-management-reorganized/e2e/admin/dashboard.spec.ts:4:3

# Error details

```
Error: browserType.launch: Executable doesn't exist at /home/node/.cache/ms-playwright/chromium_headless_shell-1169/chrome-linux/headless_shell
╔═════════════════════════════════════════════════════════════════════════╗
║ Looks like Playwright Test or Playwright was just installed or updated. ║
║ Please run the following command to download new browsers:              ║
║                                                                         ║
║     npx playwright install                                              ║
║                                                                         ║
║ <3 Playwright Team                                                      ║
╚═════════════════════════════════════════════════════════════════════════╝
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 |
   3 | test.describe('Admin Dashboard', () => {
>  4 |   test('should display admin dashboard for users with admin role', async ({ page }) => {
     |   ^ Error: browserType.launch: Executable doesn't exist at /home/node/.cache/ms-playwright/chromium_headless_shell-1169/chrome-linux/headless_shell
   5 |     // Login as admin
   6 |     await page.goto('/auth/login');
   7 |     
   8 |     // Wait for the login form to be fully loaded
   9 |     await expect(page.locator('#email')).toBeVisible();
   10 |     await expect(page.locator('#password')).toBeVisible();
   11 |     await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
   12 |     
   13 |     // Fill the form with proper timing
   14 |     await page.locator('#email').fill('admin@example.com');
   15 |     await page.locator('#password').fill('Password123!');
   16 |     
   17 |     // Wait a moment for form validation to complete
   18 |     await page.waitForTimeout(500);
   19 |     
   20 |     // Submit the form
   21 |     await page.getByRole('button', { name: /login/i }).click();
   22 |     
   23 |     // Wait for login to complete or handle any validation errors
   24 |     try {
   25 |       await page.waitForURL('**/dashboard', { timeout: 10000 });
   26 |     } catch (timeoutError) {
   27 |       // If login fails, check for error messages to provide better debugging
   28 |       const errorAlert = page.locator('[role="alert"]').filter({ hasText: 'Login Failed' });
   29 |       if (await errorAlert.isVisible()) {
   30 |         const errorText = await errorAlert.textContent();
   31 |         console.log('Login error:', errorText);
   32 |       }
   33 |       throw timeoutError;
   34 |     }
   35 |     
   36 |     // Navigate to admin dashboard
   37 |     await page.goto('/admin/dashboard');
   38 |     
   39 |     // Verify dashboard components are visible
   40 |     await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
   41 |     await expect(page.locator('text=Team Overview')).toBeVisible();
   42 |     await expect(page.locator('text=Subscription Status')).toBeVisible();
   43 |     await expect(page.locator('text=Recent Activity')).toBeVisible();
   44 |     
   45 |     // Verify team stats cards are present
   46 |     await expect(page.locator('text=Total Members')).toBeVisible();
   47 |     await expect(page.locator('text=Active Members')).toBeVisible();
   48 |     await expect(page.locator('text=Pending Invites')).toBeVisible();
   49 |     await expect(page.locator('text=Seat Usage')).toBeVisible();
   50 |     
   51 |     // Verify action buttons
   52 |     await expect(page.locator('a:has-text("Manage Team")')).toBeVisible();
   53 |     await expect(page.locator('a:has-text("Organization Settings")')).toBeVisible();
   54 |   });
   55 |
   56 |   test('should redirect non-admin users attempting to access admin dashboard', async ({ page }) => {
   57 |     // Login as regular user
   58 |     await page.goto('/auth/login');
   59 |     
   60 |     // Wait for the login form to be fully loaded
   61 |     await expect(page.locator('#email')).toBeVisible();
   62 |     await expect(page.locator('#password')).toBeVisible();
   63 |     
   64 |     await page.locator('#email').fill('user@example.com');
   65 |     await page.locator('#password').fill('Password123!');
   66 |     
   67 |     // Wait for form validation
   68 |     await page.waitForTimeout(500);
   69 |     
   70 |     await page.getByRole('button', { name: /login/i }).click();
   71 |     
   72 |     // Wait for login to complete
   73 |     await page.waitForURL('**/dashboard');
   74 |     
   75 |     // Attempt to navigate to admin dashboard
   76 |     await page.goto('/admin/dashboard');
   77 |     
   78 |     // Verify redirect back to dashboard
   79 |     await expect(page).toHaveURL(/\/dashboard$/);
   80 |   });
   81 |
   82 |   test('should load dashboard data correctly', async ({ page }) => {
   83 |     // Login as admin
   84 |     await page.goto('/auth/login');
   85 |     
   86 |     // Wait for the login form to be fully loaded
   87 |     await expect(page.locator('#email')).toBeVisible();
   88 |     await expect(page.locator('#password')).toBeVisible();
   89 |     
   90 |     await page.locator('#email').fill('admin@example.com');
   91 |     await page.locator('#password').fill('Password123!');
   92 |     
   93 |     // Wait for form validation
   94 |     await page.waitForTimeout(500);
   95 |     
   96 |     await page.getByRole('button', { name: /login/i }).click();
   97 |     
   98 |     // Wait for login to complete
   99 |     await page.waitForURL('**/dashboard');
  100 |     
  101 |     // Navigate to admin dashboard
  102 |     await page.goto('/admin/dashboard');
  103 |     
  104 |     // Wait for dashboard data to load (skeletons to disappear)
```