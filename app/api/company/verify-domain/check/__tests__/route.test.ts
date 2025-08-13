import { describe, test, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '../route';

// Mock the withValidatedServices wrapper
vi.mock('@/lib/api/with-services', () => ({
  withValidatedServices: vi.fn((config: any) => {
    return async (req: Request) => {
      // Execute handler with mocked context
      const mockContext = {
        request: req,
        userId: 'test-user-id',
        auth: { userId: 'test-user-id', user: { id: 'test-user-id', email: 'test@example.com' } },
        services: {
          company: mockCompanyService
        }
      };
      
      try {
        return await config.handler(mockContext);
      } catch (error: any) {
        if (error.status === 400) {
          return NextResponse.json({ data: { verified: false, message: error.message } }, { status: 400 });
        }
        if (error.status === 500) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        throw error;
      }
    };
  })
}));

// Mock rate limiter
vi.mock('@/middleware/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(false)
}));

// Mock audit logger
vi.mock('@/lib/audit/auditLogger', () => ({
  logUserAction: vi.fn(() => Promise.resolve())
}));

let mockCompanyService: any;


describe('POST /api/company/verify-domain/check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Initialize mock company service
    mockCompanyService = {
      checkProfileDomainVerification: vi.fn().mockResolvedValue({ 
        verified: true, 
        message: 'ok' 
      })
    };
  });

  test('returns status on success', async () => {
    const req = new NextRequest('http://localhost/api/company/verify-domain/check');
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.verified).toBe(true);
    expect(mockCompanyService.checkProfileDomainVerification).toHaveBeenCalled();
  });

  test('returns 400 when not verified', async () => {
    mockCompanyService.checkProfileDomainVerification.mockResolvedValueOnce({ verified: false, message: 'no' });
    const req = new NextRequest('http://localhost/api/company/verify-domain/check');
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.data.verified).toBe(false);
  });

  test('returns 500 on error', async () => {
    mockCompanyService.checkProfileDomainVerification.mockRejectedValueOnce(new Error('fail'));
    const req = new NextRequest('http://localhost/api/company/verify-domain/check');
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toBeDefined();
  });
});
