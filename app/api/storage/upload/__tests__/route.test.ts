import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { getStorageService } from '@/services/storage';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';

// Mock the auth middleware to bypass authentication
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: () => vi.fn((req: any) => Promise.resolve({
    userId: 'u1',
    user: { id: 'u1', email: 'test@example.com' },
    permissions: []
  }))
}));

vi.mock('@/services/storage', () => ({ getStorageService: vi.fn() }));
vi.mock('@/lib/auth/utils', () => ({
  getUserFromRequest: vi.fn().mockResolvedValue({ id: 'u1' })
}));

const service = {
  uploadFile: vi.fn().mockResolvedValue({ success: true, path: 'p' }),
  getFileUrl: vi.fn().mockResolvedValue('url'),
};

beforeEach(() => {
  vi.resetAllMocks();
  (getStorageService as unknown as vi.Mock).mockReturnValue(service);
});

describe('upload route', () => {
  it('returns 400 when no file provided', async () => {
    const req = createAuthenticatedRequest('POST', 'http://test');
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('uploads file and returns url', async () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
    const fd = new FormData();
    fd.set('file', file);
    const req = createAuthenticatedRequest('POST', 'http://test');
    (req as any).formData = async () => fd;
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.url).toBe('url');
    expect(service.uploadFile).toHaveBeenCalled();
  });
});
