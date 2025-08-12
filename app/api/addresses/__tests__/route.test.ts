import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST, GET } from '../route';
import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator';
import type { AddressService } from '@/core/address/interfaces';

// Mock the auth middleware to bypass authentication
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: () => vi.fn((req: any) => Promise.resolve({
    userId: 'u1',
    user: { id: 'u1', email: 'test@example.com' },
    permissions: []
  }))
}));

vi.mock('@/lib/api/common', () => {
  class MockApiError extends Error {
    constructor(public message: string, public code: string = 'VALIDATION_ERROR', public status: number = 400) {
      super(message);
      this.name = 'ApiError';
    }
  }
  
  return {
    ApiError: MockApiError,
    createSuccessResponse: vi.fn((data) => NextResponse.json(data, { status: 200 })),
    createCreatedResponse: vi.fn((data) => NextResponse.json(data, { status: 201 })),
    createErrorResponse: vi.fn((error) => NextResponse.json({ error: error.message }, { status: error.status || 500 })),
    createValidationError: vi.fn((message, details) => {
      const error = new MockApiError(message);
      (error as any).details = details;
      (error as any).status = 400;
      return error;
    }),
  };
});

vi.mock('@/core/address/validation', () => ({
  addressSchema: {
    safeParse: vi.fn((data) => {
      // Valid if has required fields
      if (data && data.type && data.fullName && data.street1 && data.city && data.state && data.postalCode && data.country) {
        return { success: true, data };
      }
      return { 
        success: false, 
        error: { 
          flatten: () => ({ fieldErrors: { type: ['Required'] } }) 
        }
      };
    }),
  },
}));

describe('addresses API', () => {
  const service = {
    getAddresses: vi.fn(async () => []),
    createAddress: vi.fn(async (a: any) => ({ ...a, id: '1' })),
    getAddress: vi.fn(),
    updateAddress: vi.fn(),
    deleteAddress: vi.fn(),
    setDefaultAddress: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Clear and register services in ServiceLocator
    const locator = ServiceLocator.getInstance();
    locator.clear();
    locator.register(ServiceKeys.ADDRESS_SERVICE, service);
  });

  it('GET returns addresses', async () => {
    const req = new NextRequest('http://test');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(service.getAddresses).toHaveBeenCalledWith('u1');
  });

  it('POST creates address with valid data', async () => {
    const validAddress = { 
      type: 'shipping', 
      fullName: 'John Doe', 
      street1: '123 Main St', 
      city: 'Anytown', 
      state: 'CA', 
      postalCode: '12345', 
      country: 'US' 
    };
    
    const req = new NextRequest('http://test', { 
      method: 'POST', 
      body: JSON.stringify(validAddress) 
    });
    
    // Mock req.json() method
    req.json = vi.fn().mockResolvedValue(validAddress);
    
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(service.createAddress).toHaveBeenCalledWith({ ...validAddress, userId: 'u1' });
  });

  it('POST validates input and returns 400 for invalid data', async () => {
    const invalidAddress = {}; // Missing required fields
    
    const req = new NextRequest('http://test', { 
      method: 'POST', 
      body: JSON.stringify(invalidAddress) 
    });
    
    req.json = vi.fn().mockResolvedValue(invalidAddress);
    
    // The validation error should be thrown and handled
    await expect(POST(req)).rejects.toThrow();
  });
});
