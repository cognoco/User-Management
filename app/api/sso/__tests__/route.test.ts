import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { getApiSsoService } from '@/services/sso/factory';

vi.mock('@/services/sso/factory', () => ({
  getApiSsoService: vi.fn(),
}));

const mockRequest = (body: any) =>
  new NextRequest('http://localhost/api/sso', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('/api/sso', () => {
  const mockService = {
    getProviders: vi.fn(),
    upsertProvider: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getApiSsoService as unknown as vi.Mock).mockReturnValue(mockService);
    mockService.getProviders.mockResolvedValue([]);
    mockService.upsertProvider.mockResolvedValue({
      id: '1',
      organizationId: 'org1',
      providerType: 'saml',
      providerName: 'google',
      config: {},
      isActive: true,
    });
  });
  it('GET returns providers array', async () => {
    const res = await GET(new NextRequest('http://localhost/api/sso?organizationId=org1'));
    const json = await res.json();
    expect(Array.isArray(json.providers)).toBe(true);
    expect(mockService.getProviders).toHaveBeenCalledWith('org1');
  });

  it('POST returns success for valid input', async () => {
    const req = mockRequest({
      organizationId: 'org1',
      providerType: 'saml',
      providerName: 'google',
      config: { clientId: 'abc' },
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.provider.providerName).toBe('google');
  });

  it('POST returns 400 for invalid input', async () => {
    const req = mockRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
}); 