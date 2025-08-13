import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST, GET } from '../route';

// Mock withValidatedServices to bypass ServiceLocator entirely
vi.mock('@/lib/api/with-services', () => ({
  schemas: {
    empty: {},
    address: {}
  },
  withValidatedServices: vi.fn((config: any) => {
    return async (req: NextRequest) => {
      try {
        // Parse body for POST
        let data;
        if (req.method === 'POST') {
          try {
            data = await req.json();
          } catch {
            return NextResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 });
          }
        }

        // Get mock services from test
        const mockServices = (global as any).__testMockServices || {};

        // Call the actual handler with mocked context
        return await config.handler({
          request: req,
          data,
          services: mockServices,
          userId: 'u1',
          params: {}
        });
      } catch (error: any) {
        console.error('Handler error:', error);
        // Handle validation errors
        if (error.name === 'ApiError') {
          return NextResponse.json({ error: error.message }, { status: error.status || 400 });
        }
        return NextResponse.json(
          { error: { code: error.code || 'SERVER_GENERAL_001', message: error.message } },
          { status: error.status || 500 }
        );
      }
    };
  })
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
  const mockAddressService = {
    getAddresses: vi.fn(async () => []),
    createAddress: vi.fn(async (a: any) => ({ ...a, id: '1' })),
    getAddress: vi.fn(),
    updateAddress: vi.fn(),
    deleteAddress: vi.fn(),
    setDefaultAddress: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up global mock services for withValidatedServices mock
    (global as any).__testMockServices = {
      address: mockAddressService
    };
  });

  it('GET returns addresses', async () => {
    const req = new NextRequest('http://test');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockAddressService.getAddresses).toHaveBeenCalledWith('u1');
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
    expect(mockAddressService.createAddress).toHaveBeenCalledWith({ ...validAddress, userId: 'u1' });
  });

  it('POST validates input and returns 400 for invalid data', async () => {
    const invalidAddress = {}; // Missing required fields
    
    const req = new NextRequest('http://test', { 
      method: 'POST', 
      body: JSON.stringify(invalidAddress) 
    });
    
    req.json = vi.fn().mockResolvedValue(invalidAddress);
    
    // The validation error should be handled and return 400 (not throw)
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
