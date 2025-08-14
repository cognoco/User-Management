import { test, expect } from '@playwright/test';

test('smoke test', async ({ page }) => {
  await page.goto('/');
  
  // Wait for the page to be fully loaded and hydrated
  await page.waitForLoadState('networkidle');
  
  // Debug: log what title we actually get
  const title = await page.title();
  console.log('Page title:', JSON.stringify(title));
  
  expect(title).not.toBe('');
  expect(title).toContain('User Management');
}); 