import { test, Page } from '@playwright/test';
import { loginAs } from '../../utils/auth';

// Test data
const USER_EMAIL = process.env.E2E_USER_EMAIL || 'user@example.com';
const USER_PASSWORD = process.env.E2E_USER_PASSWORD || 'password123';

test.describe('Check Delete Account Button', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await loginAs(page, USER_EMAIL, USER_PASSWORD);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Should find delete account button', async () => {
    console.log('Starting test: Should find delete account button');
    
    // Log the current URL
    console.log('Current URL:', page.url());
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'delete-button-check.png', fullPage: true });
    
    // Log all sections and their content
    const sections = await page.locator('section, div[class*="card"], div[class*="section"]').all();
    console.log(`\nFound ${sections.length} sections/cards on the page`);
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const heading = await section.locator('h1,h2,h3,h4,h5,h6').first().textContent().catch(() => 'No heading');
      const sectionClass = await section.getAttribute('class').catch(() => 'no-class');
      
      console.log(`\n--- Section ${i + 1}: ${heading} (${sectionClass}) ---`);
      console.log(await section.textContent().catch(() => 'Could not get text content'));
    }
    
    // Try different selectors to find the delete button
    const possibleSelectors = [
      'button:has-text("Delete Account")',
      'button:has-text("Delete account")',
      'button:has-text("gdpr.delete")',
      'button:has-text("delete account")',
      'button:has-text("remove account")',
      'button:has-text("delete my account")',
      'button:has-text("close account")',
      '[data-testid*="delete"]',
      '.border-destructive button',
      'button.destructive',
      'button:has(svg)',
      'button[class*="destructive"]',
      'button[class*="danger"]',
      'button[aria-label*="delete"]',
      'button[aria-label*="remove"]'
    ];

    let found = false;
    
    for (const selector of possibleSelectors) {
      const buttons = page.locator(selector);
      const count = await buttons.count();
      
      if (count > 0) {
        console.log(`Found ${count} elements matching selector: ${selector}`);
        
        for (let i = 0; i < count; i++) {
          const button = buttons.nth(i);
          const isVisible = await button.isVisible();
          const text = await button.textContent().catch(() => '');
          const className = await button.getAttribute('class').catch(() => '');
          const id = await button.getAttribute('id').catch(() => '');
          
          console.log(`Button ${i + 1}:`, { 
            text: (text ?? '').trim(), 
            visible: isVisible,
            class: className,
            id
          });
          
          if (isVisible && /delete|remove|gdpr/i.test(text || '')) {
            found = true;
            console.log('Found delete account button!');
            await button.click();
            
            // Check if a dialog appears
            const dialog = page.locator('[role="dialog"], .modal, dialog');
            if (await dialog.isVisible()) {
              console.log('Confirmation dialog appeared after clicking delete button');
              // Take screenshot of the dialog
              await dialog.screenshot({ path: 'delete-dialog.png' });
            }
            
            return; // Exit test on success
          }
        }
      }
    }
    
    // If we get here, log all buttons for debugging
    if (!found) {
      console.log('Could not find delete button. All buttons on page:');
      const allButtons = await page.locator('button').all();
      
      for (let i = 0; i < allButtons.length; i++) {
        const button = allButtons[i];
        const text = await button.textContent().catch(() => '');
        const className = await button.getAttribute('class').catch(() => '');
        const id = await button.getAttribute('id').catch(() => '');
        
        console.log(`Button ${i + 1}:`, { 
          text: (text ?? '').trim(), 
          class: className,
          id
        });
      }
      
      // Also log all sections and their content
      const sections = await page.locator('section').all();
      console.log(`\nFound ${sections.length} sections on the page`);
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const heading = await section.locator('h1,h2,h3,h4,h5,h6').first().textContent().catch(() => 'No heading');
        console.log(`\nSection ${i + 1}:`, heading);
        console.log('HTML:', await section.innerHTML().catch(() => 'Could not get HTML'));
      }
      
      throw new Error('Could not find delete account button on the page');
    }
  });
});
