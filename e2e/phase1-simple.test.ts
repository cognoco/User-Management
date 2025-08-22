import { test, expect } from '@playwright/test';

test.describe('Phase 1: Simple Authentication Tests', () => {
  test.setTimeout(120000); // 2 minutes for slow compilation

  test('1.2: Login via API', async ({ request }) => {
    // Get CSRF token
    const csrfResponse = await request.get('/api/csrf');
    const { token } = await csrfResponse.json();
    
    // Test login
    const loginResponse = await request.post('/api/auth/login', {
      headers: {
        'X-CSRF-Token': token,
      },
      data: {
        email: 'user@example.com',
        password: 'Password123!',
        rememberMe: false
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    expect(loginData.data.user.email).toBe('user@example.com');
  });

  test('1.2: Login with invalid credentials', async ({ request }) => {
    // Get CSRF token
    const csrfResponse = await request.get('/api/csrf');
    const { token } = await csrfResponse.json();
    
    // Test login with wrong password
    const loginResponse = await request.post('/api/auth/login', {
      headers: {
        'X-CSRF-Token': token,
      },
      data: {
        email: 'user@example.com',
        password: 'WrongPassword',
        rememberMe: false
      }
    });
    
    expect(loginResponse.status()).toBe(401);
    const errorData = await loginResponse.json();
    expect(errorData.error).toBeDefined();
  });

  test('1.1: Registration attempt', async ({ request }) => {
    // Get CSRF token
    const csrfResponse = await request.get('/api/csrf');
    const { token } = await csrfResponse.json();
    
    // Test registration (may fail if user exists)
    const regResponse = await request.post('/api/auth/register', {
      headers: {
        'X-CSRF-Token': token,
      },
      data: {
        email: `test${Date.now()}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      }
    });
    
    // Check if registration endpoint exists
    expect(regResponse.status()).not.toBe(404);
  });

  test('1.3: Logout endpoint exists', async ({ request }) => {
    const response = await request.post('/api/auth/logout');
    // Should return 401 (not authenticated) or 200, but not 404
    expect(response.status()).not.toBe(404);
  });

  test('1.5: Password reset endpoint exists', async ({ request }) => {
    const response = await request.post('/api/auth/reset-password', {
      data: {
        email: 'user@example.com'
      }
    });
    // Should not return 404
    expect(response.status()).not.toBe(404);
  });

  test('1.7: Email verification endpoint exists', async ({ request }) => {
    const response = await request.get('/api/auth/verify-email?token=test');
    // Should not return 404
    expect(response.status()).not.toBe(404);
  });
});