import { test, expect, Page } from '@playwright/test';
import { loginAs } from '../../utils/auth';

// --- Constants and Test Data --- //
const USER_EMAIL = process.env.E2E_USER_EMAIL || 'user@example.com';
const USER_PASSWORD = process.env.E2E_USER_PASSWORD || 'password123';

// --- Test Suite --- //
test.describe('Debug: Settings Page', () => {
  let page: Page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Login before each test
    await loginAs(page, USER_EMAIL, USER_PASSWORD);
    
    // Verify user is logged in by checking for profile or dashboard
    try {
      await Promise.race([
        page.waitForURL('**/profile**', { timeout: 10000 }),
        page.waitForURL('**/dashboard**', { timeout: 10000 })
      ]);
      
      // Small delay to ensure page is stable
      await page.waitForTimeout(1000);
    } catch (e) {
      console.log('Navigation verification failed, but continuing test');
    }
  });
  
  test.afterEach(async () => {
    await page.close();
  });

  test('Debug settings page structure', async () => {
    // Navigate to the settings page
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot of the entire page
    await page.screenshot({ path: 'debug-settings-page.png', fullPage: true });
    
    // Log the current URL
    console.log('Current URL:', page.url());
    
    // Log all sections on the page
    const sections = await page.locator('section').all();
    console.log(`Found ${sections.length} sections on the page`);
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const heading = await section.locator('h1, h2, h3, h4, h5, h6').first().textContent().catch(() => 'No heading');
      console.log(`Section ${i + 1}:`, heading);
      
      // Log all buttons in the section
      const buttons = await section.locator('button').all();
      console.log(`  Found ${buttons.length} buttons in section ${i + 1}`);
      
      for (let j = 0; j < buttons.length; j++) {
        const button = buttons[j];
        const buttonText = await button.textContent().catch(() => '');
        const buttonId = await button.getAttribute('id').catch(() => 'no-id');
        const buttonClass = await button.getAttribute('class').catch(() => 'no-class');
        console.log(`    Button ${j + 1}:`, { text: buttonText, id: buttonId, class: buttonClass });
      }
    }
    
    // Log all buttons on the page
    const allButtons = await page.locator('button').all();
    console.log(`\nFound ${allButtons.length} buttons on the page in total`);
    
    // Look for any elements that might be related to account deletion
    const potentialDeleteElements = await page.locator('*:text("delete"):not(html):not(body):not(div):not(span)').all();
    console.log(`\nFound ${potentialDeleteElements.length} elements containing 'delete'`);
    
    for (let i = 0; i < potentialDeleteElements.length; i++) {
      const el = potentialDeleteElements[i];
      const tag = await el.evaluate(node => node.tagName.toLowerCase());
      const text = await el.textContent().catch(() => '');
      const id = await el.getAttribute('id').catch(() => 'no-id');
      const classes = await el.getAttribute('class').catch(() => 'no-class');
      console.log(`  ${i + 1}. <${tag}>`, { id, class: classes, text: (text ?? '').trim() });
    }
    
    // Check if we can find the account deletion section
    const hasAccountDeletion = await page.locator('*:text("delete account"), *:text("gdpr.delete")').isVisible().catch(() => false);
    console.log('\nAccount deletion section found:', hasAccountDeletion);
    
    // If not found, check for any destructive buttons
    if (!hasAccountDeletion) {
      const destructiveButtons = await page.locator('button:has-text("delete"), button:has-text("remove"), button:has-text("gdpr")').all();
      console.log(`Found ${destructiveButtons.length} potentially relevant buttons`);
      
      for (let i = 0; i < destructiveButtons.length; i++) {
        const btn = destructiveButtons[i];
        const btnText = await btn.textContent().catch(() => '');
        console.log(`  Button ${i + 1}:`, (btnText ?? '').trim());
      }
    }
    
    // Always pass the test - we're just gathering information
    expect(true).toBe(true);
  });
});
