import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Correct ESM path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load variables from the root .env file so e2e tests
// always share the same configuration
const envPath = path.resolve(__dirname, '.env');
const envResult = dotenv.config({ path: envPath });

// Debug: Log the env file path and check if it exists
console.log(`Loading .env from: ${envPath}`);
console.log(`File exists: ${fs.existsSync(envPath)}`);
console.log(`Dotenv result:`, envResult.error ? `Error: ${envResult.error}` : 'Success');
console.log(`Parsed object:`, envResult.parsed);

// Check if we actually got the Supabase variables
const hasSupabaseInParsed = envResult.parsed && 
  (envResult.parsed.NEXT_PUBLIC_SUPABASE_URL || 
   envResult.parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
   envResult.parsed.SUPABASE_SERVICE_ROLE_KEY);

// Explicitly set environment variables if they were parsed
if (envResult.parsed && hasSupabaseInParsed) {
  for (const [key, value] of Object.entries(envResult.parsed)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
  console.log('Key environment variables status:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');
} else {
  console.log('WARNING: No Supabase variables found in .env file, manually setting them...');
  
  // If dotenv parsing fails or doesn't contain Supabase vars, use fallback
  // environment variables to avoid hardcoding secrets in the repo
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.PLAYWRIGHT_SUPABASE_URL || '';
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.PLAYWRIGHT_SUPABASE_ANON_KEY || '';
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.PLAYWRIGHT_SUPABASE_SERVICE_ROLE_KEY || '';
  }
  
  console.log('Fallback environment variables status:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');
}

import { defineConfig, devices } from '@playwright/test';

// Use real Supabase by default since credentials are configured
const useRealSupabase = process.env.E2E_USE_SUPABASE !== 'false'; // Default to true

// Configure base URL with environment variable support
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3001';

console.log(`Playwright E2E Config: Using baseURL=${baseURL}`);
console.log(`Set E2E_BASE_URL environment variable to override (e.g., E2E_BASE_URL=http://localhost:3003)`);

export default defineConfig({
  testDir: './e2e',
  timeout: 60 * 1000, // Increase overall test timeout to 60 seconds
  retries: 0, // No retries - fail fast for debugging
  workers: 1, // Single worker for debugging
  globalSetup: './e2e/utils/global-setup.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Increase timeouts for slower page loads
    navigationTimeout: 30000, // Increase navigation timeout to 30 seconds
    actionTimeout: 15000, // Increase action timeout to 15 seconds
  },
  // No webServer config - use the existing dev server
  projects: [
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        // Override timeouts for this project too
        navigationTimeout: 30000,
        actionTimeout: 15000,
      },
    },
    // Comment out other browsers for faster debugging
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Desktop Firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'Desktop Safari',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
  reporter: [['list'], ['html', { open: 'never' }]],
}); 