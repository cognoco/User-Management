import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getApiOrganizationService } from '@/services/organization/factory';



describe('organizations API', () => {
  const service = {
    getUserOrganizations: vi.fn(async () => []),
    createOrganization: vi.fn(async () => ({ success: true, organization: { id: 'o' } }))
  } as any;

  beforeEach(() => {
    // Clear and register services in ServiceLocator
  const locator = ServiceLocator.getInstance();
  locator.clear();
  locator.register(ServiceKeys.ADDRESS_SERVICE, service);
    vi.clearAllMocks();
  });

  it('GET returns organizations', async () => {
    const req = new NextRequest('http://test');
    req.headers.set('x-user-id', 'u1');
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    expect(service.getUserOrganizations).toHaveBeenCalledWith('u1');
  });

  it('POST creates organization', async () => {
    const req = new NextRequest('http://test', { method: 'POST', body: JSON.stringify({ name: 'Org' }) });
    req.headers.set('x-user-id', 'u1');
    (req as any).json = async () => ({ name: 'Org' });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    expect(service.createOrganization).toHaveBeenCalled();
  });
});
