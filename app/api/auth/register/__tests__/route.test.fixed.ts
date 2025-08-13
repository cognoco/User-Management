import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// The vitest.setup.ts already mocks @/lib/config/service-container
// We just need to work with that mock properly

describe('POST /api/auth/register', () => {
  let POST: any;
  let ERROR_CODES: any;

  const mockAuthService = { 
    register: vi.fn(),
    getCurrentUser: vi.fn().mockResolvedValue(null) // Public route
  };
  
  const mockUserService = {
    createUserProfile: vi.fn().mockResolvedValue({ success: true })
  };

  const mockCompanyService = {
    createProfile: vi.fn().mockResolvedValue({ success: true })
  };
  
  const createRequest = (body?: any) => new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : JSON.stringify({})
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Set required environment variables for Supabase
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    
    // Work with the mocked service container from vitest.setup.ts
    const { getServiceContainer, mockAuthService: globalMockAuth, mockUserService: globalMockUser } = 
      await import('@/lib/config/service-container');
    
    // Configure the global mocks
    if (globalMockAuth) {
      Object.assign(globalMockAuth, mockAuthService);
    }
    if (globalMockUser) {
      Object.assign(globalMockUser, mockUserService);
    }
    
    // Make getServiceContainer return our configured services
    (getServiceContainer as any).mockReturnValue({
      auth: mockAuthService,
      user: mockUserService,
      company: mockCompanyService,
      // Add other services that withValidatedServices might need
      permission: { hasPermission: vi.fn().mockResolvedValue(true) },
      session: { validateSession: vi.fn().mockResolvedValue(true) },
    });
    
    // Dynamically import the route to get fresh module
    const routeModule = await import('../route');
    POST = routeModule.POST;
    
    const apiCommon = await import('@/lib/api/common/error-codes');
    ERROR_CODES = apiCommon.ERROR_CODES;
    
    // Set up default successful response
    mockAuthService.register.mockResolvedValue({ 
      success: true, 
      user: { id: '1', email: 'a@test.com' },
      requiresEmailVerification: false
    });
  });

  it('validates request body', async () => {
    const res = await POST(createRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns success on valid registration', async () => {
    const res = await POST(createRequest({
      userType: 'private',
      email: 'a@test.com',
      password: 'Password123!',
      firstName: 'A',
      lastName: 'B',
      acceptTerms: true
    }));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.data.user.email).toBe('a@test.com');
    expect(mockAuthService.register).toHaveBeenCalled();
    expect(mockUserService.createUserProfile).toHaveBeenCalledWith('1', expect.any(Object));
  });

  it('returns 409 when user exists', async () => {
    mockAuthService.register.mockResolvedValue({ 
      success: false, 
      error: 'User already exists' 
    });
    
    const res = await POST(createRequest({
      userType: 'private',
      email: 'a@test.com',
      password: 'Password123!',
      firstName: 'A',
      lastName: 'B',
      acceptTerms: true
    }));
    const data = await res.json();
    expect(res.status).toBe(409);
    expect(data.error.code).toBe(ERROR_CODES.ALREADY_EXISTS);
  });

  it('handles corporate registration', async () => {
    const res = await POST(createRequest({
      userType: 'corporate',
      email: 'corp@test.com',
      password: 'Password123!',
      firstName: 'Corp',
      lastName: 'User',
      acceptTerms: true,
      companyName: 'Test Corp',
      companyWebsite: 'https://testcorp.com',
      department: 'IT',
      industry: 'Technology',
      companySize: '50-100',
      position: 'Developer'
    }));
    
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(mockAuthService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'corp@test.com',
        userType: 'corporate'
      }),
      expect.any(Object)
    );
    expect(mockCompanyService.createProfile).toHaveBeenCalled();
  });
});