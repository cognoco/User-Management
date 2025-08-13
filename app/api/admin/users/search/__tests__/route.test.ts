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

// Mock withValidatedServices pattern
vi.mock('@/lib/api/with-services', async () => {
  const actual = await vi.importActual('@/lib/api/with-services');
  return {
    ...actual,
    withValidatedServices: ({ handler, schema }: any) => async (req: any) => {
      try {
        // Extract query parameters from URL
        const url = new URL(req.url);
        const queryData = {
          query: url.searchParams.get('query') || undefined,
          page: parseInt(url.searchParams.get('page') || '1'),
          limit: parseInt(url.searchParams.get('limit') || '10'),
          status: url.searchParams.get('status') || 'all',
          sortBy: url.searchParams.get('sortBy') || 'createdAt',
          sortOrder: url.searchParams.get('sortOrder') || 'desc',
        };
        
        // Validate with schema
        const data = schema.parse(queryData);
        return handler({
          data,
          request: req,
          userId: 'test-user',
          services: mockServices,
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