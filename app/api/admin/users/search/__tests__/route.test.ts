import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock the admin service
const mockAdminService = {
  searchUsers: vi.fn()
};

// Mock the services object structure
const mockServices = {
  admin: mockAdminService
};

vi.mock('@/lib/api/route-helpers', () => ({
  createApiHandler: vi.fn((schema, handler, options) => {
    return async (req: NextRequest) => {
      // Extract query parameters from URL
      const url = new URL(req.url);
      const params = {
        query: url.searchParams.get('query') || undefined,
        page: parseInt(url.searchParams.get('page') || '1'),
        limit: parseInt(url.searchParams.get('limit') || '10'),
        status: url.searchParams.get('status') || 'all',
        sortBy: url.searchParams.get('sortBy') || 'createdAt',
        sortOrder: url.searchParams.get('sortOrder') || 'desc',
      };
      
      const authContext = { userId: 'test-user', role: 'ADMIN' };
      return handler(req, authContext, params, mockServices);
    };
  })
}));

function createRequest(query: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/admin/users/search');
  Object.entries(query).forEach(([k, v]) => url.searchParams.append(k, v));
  return { 
    method: 'GET', 
    url: url.toString(),
    nextUrl: { searchParams: new URLSearchParams(query) }
  } as unknown as NextRequest;
}

describe('admin search API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminService.searchUsers.mockResolvedValue({ 
      users: [], 
      pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 0 } 
    });
  });

  it('calls service with parsed params', async () => {
    const res = await GET(createRequest({ query: 'john' }));
    expect(res.status).toBe(200);
    expect(mockAdminService.searchUsers).toHaveBeenCalled();
  });
});