#!/usr/bin/env node

// Simple test runner without vitest to isolate the issue
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Set up environment
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

console.log('Testing service factory imports...');

try {
  // Try to import the factory
  console.log('1. Importing factory...');
  const factory = await import('./src/services/auth/factory.js');
  console.log('   ✓ Factory imported successfully');
  
  // Try to import ServiceLocator
  console.log('2. Importing ServiceLocator...');
  const locator = await import('./src/lib/config/service-locator.js');
  console.log('   ✓ ServiceLocator imported successfully');
  
  // Try to use the factory
  console.log('3. Testing getApiAuthService...');
  const service = factory.getApiAuthService();
  console.log('   ✓ Service created:', service ? 'success' : 'failed');
  
} catch (error) {
  console.error('Error during testing:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

console.log('\nAll tests passed!');