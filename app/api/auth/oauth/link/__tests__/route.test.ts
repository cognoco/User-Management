import { POST } from '../route';
import { OAuthProvider } from '@/types/oauth';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServiceContainer } from '@/lib/config/service-container';

vi.mock('@/lib/config/service-container', () => ({
  getServiceContainer: vi.fn(),
  resetServiceContainer: vi.fn(),
  configureServices: vi.fn()
}));

const mockService = {
  linkProvider: vi.fn(),
};

const createRequest = (body: object) =>
  new Request('http://localhost/api/auth/oauth/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/auth/oauth/link', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (getServiceContainer as vi.Mock).mockReturnValue({ oauth: mockService });
  });

  it('returns error when service fails', async () => {
    mockService.linkProvider.mockResolvedValue({ success: false, error: 'err', status: 400 });
    const res = await POST(createRequest({ provider: OAuthProvider.GITHUB, code: 'x' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { message: 'err' } });
    expect(mockService.linkProvider).toHaveBeenCalledWith(OAuthProvider.GITHUB, 'x');
  });

  it('returns success data from service', async () => {
    mockService.linkProvider.mockResolvedValue({ success: true, user: { id: '1' }, linkedProviders: ['g'] });
    const res = await POST(createRequest({ provider: OAuthProvider.GITHUB, code: 'y' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { success: true, linkedProviders: ['g'], user: { id: '1' } } });
  });
});
