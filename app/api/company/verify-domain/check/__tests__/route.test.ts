import { describe, test, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getApiCompanyService } from '@/services/company/factory';

vi.mock('@/middleware/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(false)
}));


describe('POST /api/company/verify-domain/check', () => {
  const service: any = { checkProfileDomainVerification: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    // Clear and register services in ServiceLocator
  const locator = ServiceLocator.getInstance();
  locator.clear();
  locator.register(ServiceKeys.ADDRESS_SERVICE, service);
    service.checkProfileDomainVerification.mockResolvedValue({ verified: true, message: 'ok' });
  });

  test('returns status on success', async () => {
    const req = new NextRequest('http://localhost/api/company/verify-domain/check');
    const res = await POST(req as any, {} as any);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.verified).toBe(true);
    expect(service.checkProfileDomainVerification).toHaveBeenCalled();
  });

  test('returns 400 when not verified', async () => {
    service.checkProfileDomainVerification.mockResolvedValueOnce({ verified: false, message: 'no' });
    const req = new NextRequest('http://localhost/api/company/verify-domain/check');
    const res = await POST(req as any, {} as any);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.data.verified).toBe(false);
  });

  test('returns 500 on error', async () => {
    service.checkProfileDomainVerification.mockRejectedValueOnce(new Error('fail'));
    const req = new NextRequest('http://localhost/api/company/verify-domain/check');
    const res = await POST(req as any, {} as any);
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toBeDefined();
  });
});
