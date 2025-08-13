import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the company service
const mockCompanyService = {
  getProfileByUserId: vi.fn(),
  listDomains: vi.fn(),
  createDomain: vi.fn(),
  deleteDomain: vi.fn(),
  updateDomain: vi.fn(),
};

vi.mock('@/services/company/factory', () => ({
  getApiCompanyService: vi.fn(() => mockCompanyService)
}));

vi.mock('@/middleware/rate-limit', () => ({ 
  checkRateLimit: vi.fn().mockResolvedValue(false),
  rateLimitMiddleware: vi.fn(() => vi.fn((handler: any) => handler))
}));

vi.mock('@/middleware/auth', () => ({
  withRouteAuth: vi.fn((handler: any) => (req: any) => handler(req, { userId: 'u1' })),
  routeAuthMiddleware: vi.fn(() => vi.fn((handler: any) => (req: any) => handler(req, { userId: 'u1' })))
}));

vi.mock('@/middleware/with-security', () => ({
  withSecurity: (handler: any) => handler
}));

vi.mock('@/middleware/createMiddlewareChain', () => ({
  createMiddlewareChain: vi.fn((middlewares: any[]) => {
    return (handler: any) => async (req: any) => {
      // For GET requests, pass auth context
      if (req.method === 'GET') {
        return handler(req, { userId: 'u1' });
      }
      // For POST requests, parse body and pass auth + data
      const body = await req.json();
      return handler(req, { userId: 'u1' }, body);
    };
  }),
  errorHandlingMiddleware: vi.fn(() => vi.fn((handler: any) => handler)),
  routeAuthMiddleware: vi.fn(() => vi.fn((handler: any) => handler)),
  rateLimitMiddleware: vi.fn(() => vi.fn((handler: any) => handler)),
  validationMiddleware: vi.fn(() => vi.fn((handler: any) => handler))
}));

import { GET, POST } from '../route';

describe('Company Domains API', () => {
  const mockCompanyProfile = {
    id: 'c1',
    user_id: 'u1'
  };

  const createGetRequest = () => new NextRequest('http://localhost/api/company/domains', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer test-token' }
  });
  
  const createPostRequest = (body: any) => new NextRequest('http://localhost/api/company/domains', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    body: JSON.stringify(body)
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCompanyService.getProfileByUserId.mockResolvedValue(mockCompanyProfile);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('GET returns domains', async () => {
    mockCompanyService.listDomains.mockResolvedValue([]);
    const res = await GET(createGetRequest());
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.domains).toEqual([]);
    expect(mockCompanyService.listDomains).toHaveBeenCalledWith('c1');
  });

  test('POST adds domain', async () => {
    mockCompanyService.listDomains.mockResolvedValue([]);
    mockCompanyService.createDomain.mockResolvedValue({ id: 'd1', domain: 'example.com' });
    const res = await POST(createPostRequest({ domain: 'example.com', companyId: 'c1' }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.id).toBe('d1');
    expect(mockCompanyService.createDomain).toHaveBeenCalledWith('c1', 'example.com', true);
  });

  test('GET returns 404 when company profile not found', async () => {
    mockCompanyService.getProfileByUserId.mockResolvedValue(null);
    const res = await GET(createGetRequest());
    expect(res.status).toBe(404);
  });
  
  test('POST returns 400 when domain already exists', async () => {
    mockCompanyService.listDomains.mockResolvedValue([{ domain: 'example.com', id: 'd1' }]);
    const res = await POST(createPostRequest({ domain: 'example.com', companyId: 'c1' }));
    expect(res.status).toBe(400);
  });
});
