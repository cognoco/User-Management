import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator';
import { createAuthMiddleware } from '@/lib/api/auth-middleware';

// Mock the auth service
const mockAuthService = { 
  deleteAccount: vi.fn(),
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'user123' })
};

// Mock the audit logger
vi.mock('@/lib/audit/auditLogger', () => ({
  logUserAction: vi.fn().mockResolvedValue(undefined)
}));

import { DELETE } from '../route';

describe('DELETE /api/auth/delete-account', () => {
  const createRequest = (password?: string) => new NextRequest('http://localhost/api/auth/delete-account', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: password ? JSON.stringify({ password }) : JSON.stringify({})
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Register the mock service in ServiceLocator
    const locator = ServiceLocator.getInstance();
    locator.clear();
    locator.register(ServiceKeys.AUTH_SERVICE, mockAuthService);
    
    mockAuthService.deleteAccount.mockResolvedValue(undefined);
    
    // Mock the auth middleware to return authenticated context
    vi.mocked(createAuthMiddleware).mockReturnValue(
      vi.fn().mockResolvedValue({
        userId: 'user123',
        isAuthenticated: true,
        user: { id: 'user123', email: 'test@example.com' },
        permissions: []
      })
    );
  });

  afterEach(() => {
    ServiceLocator.getInstance().clear();
  });

  it('returns 400 when password missing', async () => {
    const res = await DELETE(createRequest());
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error.message).toContain('Required');
  });

  it('calls service and returns success', async () => {
    const res = await DELETE(createRequest('pass'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data.message).toBe('Account successfully deleted');
    expect(mockAuthService.deleteAccount).toHaveBeenCalledWith('pass');
  });

  it('returns 400 when deleteAccount fails', async () => {
    mockAuthService.deleteAccount.mockRejectedValue(new Error('Invalid password'));
    const res = await DELETE(createRequest('wrong'));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error.message).toBe('Failed to delete account');
  });
});