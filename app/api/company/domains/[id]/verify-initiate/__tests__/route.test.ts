import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServiceSupabase } from '@/lib/database/supabase';
import { getApiCompanyService } from '@/services/company/factory';

// Mock dependencies
vi.mock('@/middleware/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(false)
}));

vi.mock('@/lib/database/supabase', () => {
  const mockSupabaseClient = {
    auth: { getUser: vi.fn() },
  };
  return { getServiceSupabase: vi.fn().mockReturnValue(mockSupabaseClient) };
});


describe('Domain Verification Initiate API', () => {
  const mockUserId = 'user-123';
  const mockCompanyId = 'company-123';
  const mockDomainId = 'domain-123';
  const mockDomain = 'example.com';
  
  const mockUser = { id: mockUserId };
  const mockDomainRecord = { 
    id: mockDomainId, 
    company_id: mockCompanyId, 
    domain: mockDomain,
    is_verified: false,
    verification_method: 'dns_txt'
  };
  
  let supabase: any;
  const service: any = {
    initiateDomainVerification: vi.fn(),
  };
  
  beforeEach(() => {
    supabase = getServiceSupabase();
    vi.resetAllMocks();
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    // Clear and register services in ServiceLocator
  const locator = ServiceLocator.getInstance();
  locator.clear();
  locator.register(ServiceKeys.ADDRESS_SERVICE, service);
    service.initiateDomainVerification.mockResolvedValue({ domain: mockDomain, verificationToken: 'token' });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('initiates domain verification successfully', async () => {
    const request = new NextRequest(
      new URL(`http://localhost/api/company/domains/${mockDomainId}/verify-initiate`)
    );
    
    const response = await POST(request, { params: { id: mockDomainId } });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.data.verificationToken).toBeDefined();
    expect(data.data.domain).toBe(mockDomain);
    expect(data.data.message).toContain('verification initiated');
    
    expect(service.initiateDomainVerification).toHaveBeenCalledWith(
      mockDomainId,
      mockUserId,
    );
  });
  
  test('returns 401 for unauthenticated requests', async () => {
    // Mock authentication failure
    supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid token' } });
    
    const request = new NextRequest(
      new URL(`http://localhost/api/company/domains/${mockDomainId}/verify-initiate`)
    );
    
    const response = await POST(request, { params: { id: mockDomainId } });
    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
  
  test('returns 404 if domain does not exist', async () => {
    service.initiateDomainVerification.mockRejectedValueOnce(new Error('Domain not found'));
    
    const request = new NextRequest(
      new URL(`http://localhost/api/company/domains/${mockDomainId}/verify-initiate`)
    );
    
    const response = await POST(request, { params: { id: mockDomainId } });
    expect(response.status).toBe(404);
    
    const data = await response.json();
    expect(data.error.message).toContain('not found');
  });
  
  test('returns 403 if user does not have permission to verify the domain', async () => {
    service.initiateDomainVerification.mockRejectedValueOnce(new Error('You do not have permission to verify this domain.'));
    
    const request = new NextRequest(
      new URL(`http://localhost/api/company/domains/${mockDomainId}/verify-initiate`)
    );
    
    const response = await POST(request, { params: { id: mockDomainId } });
    expect(response.status).toBe(403);
    
    const data = await response.json();
    expect(data.error.message).toContain('permission');
  });
  
  test('returns 500 when database update fails', async () => {
    service.initiateDomainVerification.mockRejectedValueOnce(new Error('Database error'));
    
    const request = new NextRequest(
      new URL(`http://localhost/api/company/domains/${mockDomainId}/verify-initiate`)
    );
    
    const response = await POST(request, { params: { id: mockDomainId } });
    expect(response.status).toBe(500);
    
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
  
  test('generated verification token follows expected format', async () => {
    const request = new NextRequest(
      new URL(`http://localhost/api/company/domains/${mockDomainId}/verify-initiate`)
    );
    
    const response = await POST(request, { params: { id: mockDomainId } });
    const data = await response.json();

    // Token should be a string and match expected pattern
    expect(typeof data.data.verificationToken).toBe('string');
    expect(data.data.verificationToken.length).toBeGreaterThan(10);
    expect(data.data.verificationToken).toMatch(/^verificat/);
    
    expect(service.initiateDomainVerification).toHaveBeenCalled();
  });
}); 