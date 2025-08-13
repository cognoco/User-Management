import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator';

// Mock the auth service
const mockAuthService = { 
  disableMFA: vi.fn(),
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'user123', email: 'test@example.com' })
};

import { POST } from '../route';

describe('POST /api/auth/disable-mfa', () => {
  const createRequest = (code?: string) => new NextRequest('http://localhost/api/auth/disable-mfa', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token' // Add auth header for authenticated requests
    },
    body: code ? JSON.stringify({ code }) : JSON.stringify({}) // Always provide valid JSON
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Register the mock service in ServiceLocator
    const locator = ServiceLocator.getInstance();
    locator.clear();
    locator.register(ServiceKeys.AUTH_SERVICE, mockAuthService);
    
    mockAuthService.disableMFA.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    ServiceLocator.getInstance().clear();
  });

  it('returns 400 when code missing', async () => {
    const res = await POST(createRequest());
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error.message).toContain('Required');
  });

  it('returns success when MFA disabled', async () => {
    const res = await POST(createRequest('1234'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data.message).toBe('MFA has been disabled');
    expect(mockAuthService.disableMFA).toHaveBeenCalledWith('1234');
  });

  it('returns 400 when MFA disable fails', async () => {
    mockAuthService.disableMFA.mockResolvedValue({ success: false, error: 'Invalid code' });
    const res = await POST(createRequest('wrong'));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error.message).toBe('Invalid code');
  });
});