import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

const mockAuthService = { sendMagicLink: vi.fn() };

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
            auth: mockAuthService,
            audit: { logUserAction: vi.fn() },
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

describe('POST /api/auth/passwordless', () => {
  const createRequest = (email?: string) => new Request('http://localhost/api/auth/passwordless', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: email ? JSON.stringify({ email }) : JSON.stringify({})
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.sendMagicLink.mockResolvedValue({ success: true });
  });

  it('returns 400 when body is missing', async () => {
    const res = await POST(createRequest() as any);
    expect(res.status).toBe(400);
  });

  it('returns success when magic link sent', async () => {
    const res = await POST(createRequest('test@example.com') as any);
    expect(res.status).toBe(200);
    expect(mockAuthService.sendMagicLink).toHaveBeenCalledWith('test@example.com');
  });
});
