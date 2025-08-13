import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

const mockAuthService = { disableMFA: vi.fn() };

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

describe('POST /api/auth/mfa/disable', () => {
  const createRequest = (code?: string) => new NextRequest('http://localhost/api/auth/mfa/disable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: code ? JSON.stringify({ code }) : JSON.stringify({})
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.disableMFA.mockResolvedValue({ success: true });
  });

  it('returns 400 when code missing', async () => {
    const res = await POST(createRequest());
    expect(res.status).toBe(400);
  });

  it('returns success when MFA disabled', async () => {
    const res = await POST(createRequest('1234'));
    expect(res.status).toBe(200);
  });
});
