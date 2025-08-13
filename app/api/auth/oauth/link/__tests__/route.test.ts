import { POST } from '../route';
import { OAuthProvider } from '@/types/oauth';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockService = {
  linkProvider: vi.fn(),
};

// Mock withValidatedServices pattern
vi.mock('@/lib/api/with-services', async () => {
  const actual = await vi.importActual('@/lib/api/with-services');
  return {
    ...actual,
    withValidatedServices: ({ handler, schema }: any) => async (req: any) => {
      try {
        const body = await req.json();
        const data = schema.parse(body);
        return handler({
          data,
          request: req,
          services: {
            oauth: mockService,
          },
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return new Response(JSON.stringify({ 
            error: { 
              code: 'VALIDATION_ERROR', 
              message: error.issues?.[0]?.message || 'Validation failed' 
            } 
          }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        throw error;
      }
    },
  };
});

const createRequest = (body: object) =>
  new Request('http://localhost/api/auth/oauth/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/auth/oauth/link', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
