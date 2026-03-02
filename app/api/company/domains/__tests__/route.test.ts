import { describe, test, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '../route';
import { DELETE, PATCH } from '../[id]/route';
import { getApiCompanyService } from '@/services/company/factory';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';

vi.mock('@/services/company/factory', () => ({ getApiCompanyService: vi.fn() }));
vi.mock('@/middleware/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(false) }));
vi.mock('@/middleware/auth', () => ({
  withRouteAuth: vi.fn((handler: any, req: any) => handler(req, { userId: 'u1' })),
}));

describe('Company Domains API', () => {
  const service = {
    listDomains: vi.fn(),
    createDomain: vi.fn(),
    deleteDomain: vi.fn(),
    updateDomain: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.mocked(getApiCompanyService).mockReturnValue(service);
    vi.clearAllMocks();
  });

  test('GET returns domains', async () => {
    service.listDomains.mockResolvedValue([]);
    const req = createAuthenticatedRequest('GET', 'http://t?companyId=c1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(service.listDomains).toHaveBeenCalledWith('c1');
  });

  test('POST adds domain', async () => {
    service.createDomain.mockResolvedValue({ id: 'd1' });
    const req = createAuthenticatedRequest('POST', 'http://t', { domain: 'ex.com', companyId: 'c1' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(service.createDomain).toHaveBeenCalled();
  });

  test('DELETE removes domain', async () => {
    service.deleteDomain.mockResolvedValue(undefined);
    const req = createAuthenticatedRequest('DELETE', 'http://t');
    const res = await DELETE(req, { params: { id: 'd1' } } as any);
    expect(res.status).toBe(200);
    expect(service.deleteDomain).toHaveBeenCalledWith('d1');
  });

  test('PATCH updates domain', async () => {
    service.updateDomain.mockResolvedValue({ id: 'd1', is_primary: true });
    const req = createAuthenticatedRequest('PATCH', 'http://t', { is_primary: true });
    const res = await PATCH(req, { params: { id: 'd1' } } as any);
    expect(res.status).toBe(200);
    expect(service.updateDomain).toHaveBeenCalled();
  });
});
