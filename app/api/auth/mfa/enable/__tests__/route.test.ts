import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

const mockAuthService = { setupMFA: vi.fn() };

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
          userId: 'test-user-id',
          services: {
            auth: mockAuthService,
          },
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return new Response(JSON.stringify({ 
            error: { 
              code: 'VALIDATION_ERROR', 
              message: 'Validation failed' 
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

describe('POST /api/auth/mfa/enable', () => {
  const createRequest = () => new Request('http://localhost/api/auth/mfa/enable', { 
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({})
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.setupMFA.mockResolvedValue({ success: true, secret: 'secret123', qrCode: 'qr123' });
  });

  it('returns success when MFA enabled', async () => {
    const res = await POST(createRequest() as any);
    expect(res.status).toBe(200);
  });
});
