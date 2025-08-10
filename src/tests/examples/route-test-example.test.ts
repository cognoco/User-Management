/**
 * Example of how to properly test routes using the test service container
 * This eliminates all circular dependency issues
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestServiceContainer, resetTestServiceContainer } from '@/tests/utils/test-service-container';

// Mock the service container BEFORE any imports that use it
const mockContainer = createTestServiceContainer();
vi.mock('@/lib/config/service-container', () => ({
  getServiceContainer: () => mockContainer,
  configureServices: vi.fn(),
  resetServiceContainer: vi.fn(),
}));

// Mock auth middleware to return authenticated context
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: () => () => Promise.resolve({
    isAuthenticated: true,
    userId: 'user-1',
    user: { id: 'user-1', email: 'test@example.com' },
    permissions: ['READ', 'WRITE'],
    token: 'test-token',
  }),
  withRouteAuth: (handler: any) => handler,
}));

// Mock API handler creation
vi.mock('@/lib/api/route-helpers', () => ({
  createApiHandler: (handler: any) => handler,
}));

// Now import the route AFTER mocks are set up
import { POST } from '@/app/api/auth/register/route';

describe('Route Test Example', () => {
  beforeEach(() => {
    // Reset all mocks between tests
    resetTestServiceContainer(mockContainer);
  });

  it('should handle registration successfully', async () => {
    // Customize the mock for this specific test
    mockContainer.auth.register = vi.fn().mockResolvedValue({
      user: { id: 'new-user', email: 'new@example.com' },
      token: 'new-token'
    });

    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.email).toBe('new@example.com');
    expect(mockContainer.auth.register).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User'
    });
  });

  it('should handle validation errors', async () => {
    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email',
        password: '123', // Too weak
      }),
    });

    const response = await POST(request);
    
    expect(response.status).toBe(400);
    // Service should not be called for invalid input
    expect(mockContainer.auth.register).not.toHaveBeenCalled();
  });

  it('should handle service errors', async () => {
    // Make the service throw an error
    mockContainer.auth.register = vi.fn().mockRejectedValue(
      new Error('Email already exists')
    );

    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'existing@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('already exists');
  });
});