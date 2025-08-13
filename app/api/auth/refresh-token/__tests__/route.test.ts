import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator';

// Mock the audit logger
vi.mock('@/lib/audit/auditLogger', () => ({
  logUserAction: vi.fn().mockResolvedValue(undefined)
}));

import { POST } from '../route';

describe('POST /api/auth/refresh-token', () => {
  const mockAuthService = { 
    refreshToken: vi.fn(), 
    getTokenExpiry: vi.fn(),
    getCurrentUser: vi.fn().mockResolvedValue(null)
  };
  
  const createRequest = () => new NextRequest('http://localhost/api/auth/refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Register the mock service in ServiceLocator
    const locator = ServiceLocator.getInstance();
    locator.clear();
    locator.register(ServiceKeys.AUTH_SERVICE, mockAuthService);
    
    mockAuthService.refreshToken.mockResolvedValue(true);
    mockAuthService.getTokenExpiry.mockReturnValue(123);
  });
  
  afterEach(() => {
    ServiceLocator.getInstance().clear();
  });

  it('returns success when token is refreshed', async () => {
    const res = await POST(createRequest());
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data.success).toBe(true);
    expect(data.data.expiresAt).toBe(123);
    expect(mockAuthService.refreshToken).toHaveBeenCalled();
  });

  it('redirects to login when refresh fails', async () => {
    mockAuthService.refreshToken.mockResolvedValue(false);
    const res = await POST(createRequest());
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/login');
  });
});
