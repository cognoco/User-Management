#!/usr/bin/env node

/**
 * Manual test runner to verify the refactoring fixes
 * Since vitest is hanging due to environment issues, we'll test manually
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Set up test environment
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Simple assertion helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

// Test 1: Auth Factory Test
async function testAuthFactory() {
  console.log('\n📋 Testing Auth Factory...');
  
  try {
    // Import modules
    const { getApiAuthService } = await import('./src/services/auth/factory.js');
    const { ServiceLocator, ServiceKeys } = await import('./src/lib/config/service-locator.js');
    const { AdapterRegistry } = await import('./src/adapters/registry.js');
    
    // Test 1.1: Create service with adapter
    console.log('\n  Test 1.1: Create service with adapter and cache');
    const mockAdapter = { name: 'mock-adapter' };
    AdapterRegistry.getInstance().registerAdapter('auth', mockAdapter);
    
    const service1 = getApiAuthService({ reset: true });
    const service2 = getApiAuthService();
    
    assert(service1 != null, 'Service 1 created');
    assert(service2 != null, 'Service 2 created');
    assert(service1 === service2, 'Services are cached (same instance)');
    
    // Test 1.2: ServiceLocator integration
    console.log('\n  Test 1.2: ServiceLocator integration');
    ServiceLocator.getInstance().clear();
    
    const mockAuthService = { 
      name: 'mock-auth-service',
      login: () => {},
      register: () => {},
      // ... other methods
    };
    
    ServiceLocator.getInstance().register(ServiceKeys.AUTH_SERVICE, mockAuthService);
    const service3 = getApiAuthService({ reset: true });
    
    assert(service3 === mockAuthService, 'Service from ServiceLocator is used');
    
    // Test 1.3: Reset functionality
    console.log('\n  Test 1.3: Reset functionality');
    ServiceLocator.getInstance().clear();
    AdapterRegistry.getInstance().registerAdapter('auth', mockAdapter);
    
    const service4 = getApiAuthService({ reset: true });
    const service5 = getApiAuthService();
    const service6 = getApiAuthService({ reset: true });
    
    assert(service4 === service5, 'Service 4 and 5 are same (cached)');
    assert(service6 !== service4, 'Service 6 is different (reset)');
    
    console.log('\n✅ Auth Factory tests passed!');
    return true;
  } catch (error) {
    console.error('\n❌ Auth Factory test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Test 2: Register Route Test
async function testRegisterRoute() {
  console.log('\n📋 Testing Register Route...');
  
  try {
    // Import modules
    const { ServiceLocator, ServiceKeys } = await import('./src/lib/config/service-locator.js');
    
    // Clear and set up mocks
    ServiceLocator.getInstance().clear();
    
    const mockAuthService = {
      register: async (data) => {
        if (data.email === 'existing@test.com') {
          return { success: false, error: 'User already exists' };
        }
        return { 
          success: true, 
          user: { id: '123', email: data.email },
          requiresEmailVerification: false
        };
      },
      getCurrentUser: async () => null
    };
    
    const mockUserService = {
      createUserProfile: async () => ({ success: true })
    };
    
    const mockCompanyService = {
      createProfile: async () => ({ success: true })
    };
    
    // Register services
    ServiceLocator.getInstance().register(ServiceKeys.AUTH_SERVICE, mockAuthService);
    ServiceLocator.getInstance().register(ServiceKeys.USER_SERVICE, mockUserService);
    ServiceLocator.getInstance().register(ServiceKeys.COMPANY_SERVICE, mockCompanyService);
    
    // Import route
    const { POST } = await import('./app/api/auth/register/route.js');
    
    // Test 2.1: Valid registration
    console.log('\n  Test 2.1: Valid registration');
    const validRequest = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userType: 'private',
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        acceptTerms: true
      })
    });
    
    const response1 = await POST(validRequest);
    const data1 = await response1.json();
    
    assert(response1.status === 201, 'Response status is 201 Created');
    assert(data1.data.user.email === 'test@example.com', 'User email matches');
    
    // Test 2.2: Invalid request (validation)
    console.log('\n  Test 2.2: Invalid request validation');
    const invalidRequest = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid'
      })
    });
    
    const response2 = await POST(invalidRequest);
    assert(response2.status === 400, 'Response status is 400 Bad Request');
    
    // Test 2.3: User already exists
    console.log('\n  Test 2.3: User already exists');
    const existingRequest = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userType: 'private',
        email: 'existing@test.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        acceptTerms: true
      })
    });
    
    const response3 = await POST(existingRequest);
    const data3 = await response3.json();
    
    assert(response3.status === 409, 'Response status is 409 Conflict');
    assert(data3.error.code === 'ALREADY_EXISTS', 'Error code is ALREADY_EXISTS');
    
    console.log('\n✅ Register Route tests passed!');
    return true;
  } catch (error) {
    console.error('\n❌ Register Route test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Manual Test Runner');
  console.log('====================');
  console.log('Testing refactored code after dependency injection migration...\n');
  
  let allPassed = true;
  
  // Run auth factory test
  const factoryPassed = await testAuthFactory();
  allPassed = allPassed && factoryPassed;
  
  // Run register route test
  const routePassed = await testRegisterRoute();
  allPassed = allPassed && routePassed;
  
  // Summary
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All tests passed! The refactoring fixes are working.');
  } else {
    console.log('❌ Some tests failed. Please review the errors above.');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});