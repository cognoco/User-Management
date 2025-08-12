import { describe, test, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getApiCompanyService } from '@/services/company/factory';

vi.mock('@/middleware/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(false)
}));


describe('POST /api/company/verify-domain/initiate', () => {
  const service: any = { initiateProfileDomainVerification: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    // Clear and register services in ServiceLocator
  const locator = ServiceLocator.getInstance();
  locator.clear();
  locator.register(ServiceKeys.ADDRESS_SERVICE, service);
    service.initiateProfileDomainVerification.mockResolvedValue({ domainName: 'example.com', verificationToken: 'token' });
  });

  test('returns token on success', async () => {
    const req = new NextRequest('http://localhost/api/company/verify-domain/initiate');
    const res = await POST(req as any, {} as any);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.verificationToken).toBe('token');
    expect(service.initiateProfileDomainVerification).toHaveBeenCalled();
  });

  test('returns 500 on error', async () => {
    service.initiateProfileDomainVerification.mockRejectedValueOnce(new Error('fail'));
    const req = new NextRequest('http://localhost/api/company/verify-domain/initiate');
    const res = await POST(req as any, {} as any);
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toBeDefined();
  });
});
