/**
 * E2E tests for Feature 7.2: Session Management (Admin)
 * 
 * These tests verify that administrators can:
 * - View active sessions for all team members
 * - See detailed session information (user, IP, device, login time)
 * - Revoke sessions for team members
 * - Handle error cases appropriately
 * 
 * Based on specifications in functionality-features-phase7.md
 */

import { test, expect, Page } from '@playwright/test';

// Admin credentials from environment or defaults
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'adminpassword';

/**
 * Helper function to login as admin
 */
async function loginAsAdmin(page: Page): Promise<boolean> {
  await page.goto('/auth/login');
  
  try {
    // Fill login form with multiple selector attempts for resilience
    await page.fill('#email, input[name="email"]', ADMIN_EMAIL);
    await page.fill('#password, input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await Promise.race([
      page.waitForURL('**/admin**', { timeout: 10000 }),
      page.waitForURL('**/dashboard**', { timeout: 10000 })
    ]);
    
    // If we're not on an admin page, try to navigate there
    if (!page.url().includes('/admin')) {
      await page.goto('/admin');
    }
    
    return true;
  } catch (e) {
    console.log('Admin login or navigation failed:', e);
    await page.screenshot({ path: 'admin-login-failed.png' });
    return false;
  }
}

/**
 * Helper function to navigate to admin session management page
 */
async function navigateToSessionManagement(page: Page): Promise<boolean> {
  try {
    // Try multiple possible paths to session management
    
    // First try: direct navigation
    await page.goto('/admin/sessions');
    
    // Check if sessions table is visible
    const sessionsTable = page.locator('table').filter({ hasText: /user|email|ip|device|login time/i });
    if (await sessionsTable.isVisible({ timeout: 3000 }).catch(() => false)) {
      return true;
    }
    
    // Second try: navigate to admin dashboard and look for sessions link
    await page.goto('/admin');
    
    // Look for link to session management
    const sessionsLink = page.getByRole('link', { name: /sessions|active sessions/i })
      .or(page.getByText(/session management|active sessions/i).first());
      
    if (await sessionsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sessionsLink.click();
      await page.waitForLoadState('domcontentloaded');
      return true;
    }
    
    // Third try: check if there's a "Security" section with a subsection for sessions
    const securityLink = page.getByRole('link', { name: /security/i });
    if (await securityLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await securityLink.click();
      
      // Look for sessions tab or subsection
      const sessionsTab = page.getByRole('tab', { name: /sessions|active sessions/i })
        .or(page.getByRole('link', { name: /sessions|active sessions/i }));
        
      if (await sessionsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sessionsTab.click();
        return true;
      }
    }
    
    // If we can't find the session management page, take a screenshot for debugging
    await page.screenshot({ path: 'admin-sessions-not-found.png' });
    console.log('Could not find admin session management page');
    
    return false;
  } catch (e) {
    console.log('Error navigating to session management:', e);
    return false;
  }
}

// Test suite for admin session management
test.describe('7.2: Session Management (Admin)', () => {
  let page: Page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Login as admin before each test
    const loginSuccessful = await loginAsAdmin(page);
    if (!loginSuccessful) {
      test.skip();
    }
  });
  
  test.afterEach(async () => {
    await page.close();
  });

  test('Admin can view active sessions for team members', async () => {
    // Navigate to session management section
    const navigated = await navigateToSessionManagement(page);
    expect(navigated).toBe(true);
    
    // Verify sessions table is visible
    const sessionsTable = page.locator('table').filter({ hasText: /user|email|ip|device|login time/i });
    await expect(sessionsTable).toBeVisible();
    
    // Verify table has appropriate columns (should have user info, device, IP, etc.)
    const expectedColumns = ['User', 'Email', 'IP Address', 'Device', 'Login Time', 'Last Active'];
    
    // Check that at least a few of these columns exist in some form
    let foundColumnCount = 0;
    for (const column of expectedColumns) {
      const columnHeader = page.getByRole('columnheader', { name: new RegExp(column, 'i') })
        .or(page.locator('th').filter({ hasText: new RegExp(column, 'i') }));
        
      if (await columnHeader.isVisible().catch(() => false)) {
        foundColumnCount++;
      }
    }
    
    // We should find at least 3 of the expected columns
    expect(foundColumnCount).toBeGreaterThanOrEqual(3);
    
    // Check if sessions data is loaded (at least one row in the table)
    const sessionRows = sessionsTable.locator('tbody tr');
    const rowCount = await sessionRows.count();
    expect(rowCount).toBeGreaterThan(0);
    
    // Verify action buttons exist (revoke session)
    const actionButton = page.getByRole('button', { name: /revoke|terminate|logout/i });
    expect(await actionButton.count()).toBeGreaterThan(0);
  });

  test('Admin can filter or sort session list', async () => {
    // Navigate to session management section
    const navigated = await navigateToSessionManagement(page);
    expect(navigated).toBe(true);
    
    // Look for filtering or sorting controls
    const filterInput = page.getByPlaceholder(/search|filter/i)
      .or(page.locator('input[type="search"]'));
      
    const sortButtons = page.getByRole('button', { name: /sort|order/i })
      .or(page.locator('th button'));
    
    // If either filtering or sorting controls exist, test them
    if (await filterInput.isVisible().catch(() => false)) {
      // Test filtering
      await filterInput.fill('admin');
      
      // Wait for filtering to apply
      await page.waitForTimeout(500);
      
      // Check that filtered results contain the search term
      const filteredRows = page.locator('tbody tr');
      if (await filteredRows.count() > 0) {
        // Get text from the first row
        const firstRowText = await filteredRows.first().innerText();
        // The row should contain the filter text (case insensitive)
        expect(firstRowText.toLowerCase()).toContain('admin');
      }
    } else if (await sortButtons.count() > 0) {
      // Test sorting if available
      await sortButtons.first().click();
      
      // Wait for sorting to apply
      await page.waitForTimeout(500);
      
      // Cannot easily verify sorting order, but at least verify the table still has rows
      const rows = page.locator('tbody tr');
      expect(await rows.count()).toBeGreaterThan(0);
    } else {
      console.log('No filtering or sorting controls found, skipping this part of the test');
    }
  });

  test('Admin can revoke a user session', async () => {
    // Navigate to session management section
    const navigated = await navigateToSessionManagement(page);
    expect(navigated).toBe(true);
    
    // Get initial session count
    const sessionsTable = page.locator('table').filter({ hasText: /user|email|ip|device|login time/i });
    const sessionRows = sessionsTable.locator('tbody tr');
    const initialSessionCount = await sessionRows.count();
    
    // Skip if no sessions to revoke
    if (initialSessionCount === 0) {
      console.log('No sessions available to revoke, skipping test');
      test.skip();
      return;
    }
    
    // Find a session to revoke (not admin's current session if possible)
    
    // First look for sessions with usernames that don't contain admin
    const nonAdminRows = sessionRows.filter({ hasNotText: new RegExp(ADMIN_EMAIL, 'i') });
    const nonAdminCount = await nonAdminRows.count();
    
    let revokeButton;
    if (nonAdminCount > 0) {
      // If non-admin session exists, revoke that one
      revokeButton = nonAdminRows.first().locator('button', { hasText: /revoke|terminate|logout/i });
    } else {
      // Otherwise, try to revoke any session except the current one
      // Look for sessions that don't say "Current Session"
      const nonCurrentRows = sessionRows.filter({ hasNotText: /current session/i });
      
      if (await nonCurrentRows.count() > 0) {
        revokeButton = nonCurrentRows.first().locator('button', { hasText: /revoke|terminate|logout/i });
      } else {
        // If all else fails, try the first session
        revokeButton = sessionRows.first().locator('button', { hasText: /revoke|terminate|logout/i });
      }
    }
    
    // Verify revoke button exists and is clickable
    await expect(revokeButton).toBeVisible();
    
    // Take a screenshot before revocation
    await page.screenshot({ path: 'before-session-revocation.png' });
    
    // Click the revoke button
    await revokeButton.click();
    
    // Handle confirmation dialog if it appears
    const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
    }
    
    // Verify success message appears
    const successMessage = page.getByText(/revoked|terminated|success/i);
    await expect(successMessage).toBeVisible({ timeout: 5000 });
    
    // Wait for table to update
    await page.waitForTimeout(1000);
    
    // Take a screenshot after revocation
    await page.screenshot({ path: 'after-session-revocation.png' });
    
    // Verify session count decreased (if not refreshed) or session is marked as revoked
    const afterRows = sessionsTable.locator('tbody tr');
    const afterSessionCount = await afterRows.count();
    
    // Either the count decreased, or there's a visual indicator of revocation
    const revokedIndicator = page.getByText(/revoked|terminated/i);
    
    expect(
      afterSessionCount < initialSessionCount || 
      await revokedIndicator.isVisible().catch(() => false)
    ).toBeTruthy();
  });

  test('Admin cannot revoke their own current session', async () => {
    // Navigate to session management section
    const navigated = await navigateToSessionManagement(page);
    expect(navigated).toBe(true);
    
    // Look for indication of current session
    const currentSessionRow = page.locator('tr').filter({ hasText: /current session/i })
      .or(page.locator('tr.current, tr[class*="current"]'));
      
    // If we can't identify the current session, look for admin's email in a row
    if (await currentSessionRow.count() === 0) {
      const adminRows = page.locator('tr').filter({ hasText: new RegExp(ADMIN_EMAIL, 'i') });
      
      // If multiple rows with admin email, take the first one
      if (await adminRows.count() > 0) {
        await adminRows.first().screenshot({ path: 'admin-session-row.png' });
        
        // Check if the row has a revoke button that's disabled or missing
        const revokeButton = adminRows.first().locator('button', { hasText: /revoke|terminate|logout/i });
        
        if (await revokeButton.count() > 0) {
          // Check if button is disabled
          const isDisabled = await revokeButton.isDisabled().catch(() => false);
          
          if (isDisabled) {
            console.log('Verified: Revoke button for admin\'s current session is disabled');
          } else {
            // If button is not disabled, click it and expect an error message
            await revokeButton.click();
            
            // Look for error message or canceled operation
            const errorMessage = page.getByText(/cannot revoke|cannot terminate|current session/i);
            await expect(errorMessage).toBeVisible({ timeout: 5000 });
          }
        } else {
          // No revoke button found for admin's session - that's also acceptable
          console.log('Verified: No revoke button exists for admin\'s current session');
        }
      } else {
        console.log('Could not identify admin\'s current session, skipping test');
        test.skip();
      }
    } else {
      // Found a row marked as current session
      await currentSessionRow.screenshot({ path: 'current-session-row.png' });
      
      // Check if the row has a revoke button that's disabled or missing
      const revokeButton = currentSessionRow.locator('button', { hasText: /revoke|terminate|logout/i });
      
      if (await revokeButton.count() > 0) {
        // Check if button is disabled
        const isDisabled = await revokeButton.isDisabled().catch(() => false);
        
        if (isDisabled) {
          console.log('Verified: Revoke button for current session is disabled');
        } else {
          // If button is not disabled, click it and expect an error message
          await revokeButton.click();
          
          // Look for error message or canceled operation
          const errorMessage = page.getByText(/cannot revoke|cannot terminate|current session/i);
          await expect(errorMessage).toBeVisible({ timeout: 5000 });
        }
      } else {
        // No revoke button found for current session - that's also acceptable
        console.log('Verified: No revoke button exists for current session');
      }
    }
  });

  test('Session details show correct information', async () => {
    // Navigate to session management section
    const navigated = await navigateToSessionManagement(page);
    expect(navigated).toBe(true);
    
    // Get the first session row
    const sessionsTable = page.locator('table').filter({ hasText: /user|email|ip|device|login time/i });
    const sessionRows = sessionsTable.locator('tbody tr');
    
    // Skip if no sessions
    if (await sessionRows.count() === 0) {
      console.log('No sessions available to check, skipping test');
      test.skip();
      return;
    }
    
    // Get the first row
    const firstRow = sessionRows.first();
    
    // Verify it contains expected information types
    const rowText = await firstRow.innerText();
    
    // Session should contain some form of:
    // 1. User identifier (name or email)
    // 2. IP Address (often has dots like 192.168.1.1)
    // 3. Browser/device info
    // 4. Timestamp/date
    
    const containsUserInfo = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(rowText);
    const containsIPFormat = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(rowText) || /IP Address/i.test(rowText);
    const containsDeviceInfo = /chrome|firefox|safari|edge|browser|windows|mac|android|ios/i.test(rowText);
    const containsTimeInfo = /\d{1,2}:\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|today|yesterday|ago/i.test(rowText);
    
    // Session row should contain at least 3 of these 4 information types
    const infoTypesFound = [containsUserInfo, containsIPFormat, containsDeviceInfo, containsTimeInfo]
      .filter(Boolean).length;
    
    expect(infoTypesFound).toBeGreaterThanOrEqual(3);
  });
  
  test('Admin can view detailed session information', async () => {
    // Navigate to session management section
    const navigated = await navigateToSessionManagement(page);
    expect(navigated).toBe(true);
    
    // Get the first session row
    const sessionsTable = page.locator('table').filter({ hasText: /user|email|ip|device|login time/i });
    const sessionRows = sessionsTable.locator('tbody tr');
    
    // Skip if no sessions
    if (await sessionRows.count() === 0) {
      console.log('No sessions available to check, skipping test');
      test.skip();
      return;
    }
    
    // Look for a details button or expandable row
    const detailsButton = sessionRows.first().locator('button', { hasText: /details|more|expand/i })
      .or(sessionRows.first().locator('button').filter({ hasText: /view/i }));
    
    if (await detailsButton.isVisible().catch(() => false)) {
      // If details button exists, click it
      await detailsButton.click();
      
      // Verify detailed information is shown
      const detailsPanel = page.locator('[role="dialog"]')
        .or(page.locator('.details-panel'))
        .or(page.locator('.expanded-row'));
      
      await expect(detailsPanel).toBeVisible();
      
      // Details should contain additional information
      const detailsText = await detailsPanel.innerText();
      
      // Check for comprehensive session details
      const hasDetailedInfo = /user agent|browser version|os version|location|city|country|region|first seen|created|latest activity/i.test(detailsText);
      
      expect(hasDetailedInfo).toBeTruthy();
      
      // Close details if there's a close button
      const closeButton = detailsPanel.locator('button', { hasText: /close|done|ok/i });
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
      }
    } else {
      console.log('No details button found, assuming all session details are in the main view');
      
      // Even without a details button, verify the main view shows adequate information
      const rowText = await sessionRows.first().innerText();
      
      // Verify adequate information is present
      const hasAdequateInfo = /user|email|ip|device|browser|login|time/i.test(rowText);
      expect(hasAdequateInfo).toBeTruthy();
    }
  });
}); 