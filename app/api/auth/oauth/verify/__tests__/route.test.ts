import { POST } from '../route';
import { OAuthProvider } from '@/types/oauth';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServiceContainer } from '@/lib/config/service-container';

// Mock cookies
const mockCookies = new Map<string, any>();
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (key: string) => mockCookies.get(key),
    set: (key: string | { name: string; [key: string]: any }, value?: string | object) => {
      if (typeof key === 'string') {
        mockCookies.set(key, { name: key, value, httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/', ...((typeof value === 'object') ? value : {}) });
      } else {
        mockCookies.set(key.name, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/', ...key });
      }
    },
    has: (key: string) => mockCookies.has(key),
    delete: (key: string) => mockCookies.delete(key),
    getAll: () => Array.from(mockCookies.values()),
  }),
}));

vi.mock('@/lib/config/service-container', () => ({
  getServiceContainer: vi.fn(),
  resetServiceContainer: vi.fn(),
  configureServices: vi.fn()
}));
const mockService = {
  verifyProviderEmail: vi.fn(),
};

const createRequest = (body: object) => new Request('http://localhost/api/auth/oauth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const loggedInUser = { id: 'user1', email: 'test@example.com' };

describe('oauth verify route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.clear();
    (getServiceContainer as vi.Mock).mockReturnValue({ oauth: mockService });
    mockService.verifyProviderEmail.mockResolvedValue({ success: true });
  });

  it('returns 401 when unauthenticated', async () => {
    mockService.verifyProviderEmail.mockResolvedValueOnce({ success: false, status: 401, error: 'auth' });
    const request = createRequest({ providerId: OAuthProvider.GITHUB, email: 'new@example.com' });
    const res = await POST(request);
    expect(res.status).toBe(401);
  });

  it('returns 409 when email already used by another user', async () => {
    mockService.verifyProviderEmail.mockResolvedValueOnce({ success: false, status: 409, error: 'exists' });
    const request = createRequest({ providerId: OAuthProvider.GITHUB, email: 'existing@example.com' });
    const res = await POST(request);
    expect(res.status).toBe(409);
  });

  it('returns success and sends notification', async () => {
    const request = createRequest({ providerId: OAuthProvider.GITHUB, email: 'new@example.com' });
    const res = await POST(request);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.success).toBe(true);
    expect(mockService.verifyProviderEmail).toHaveBeenCalledWith(
      OAuthProvider.GITHUB,
      'new@example.com',
    );
  });
});