import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServiceSupabase } from '@/lib/database/supabase';
import { getApiCompanyService } from '@/services/company/factory';
import dns from 'dns/promises';

// Mock dependencies
vi.mock('@/middleware/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(false)
}));

vi.mock('@/lib/database/supabase', () => {
  const mockSupabaseClient = { auth: { getUser: vi.fn() } };
  return { getServiceSupabase: vi.fn().mockReturnValue(mockSupabaseClient) };
});
vi.mock('@/services/company/factory', () => ({
  getApiCompanyService: vi.fn(),
}));

// Mock DNS lookup
vi.mock('dns/promises', () => ({
  default: {
    resolveTxt: vi.fn()
  }
}));

describe('Domain Verification Check API', () => {
  const mockUserId = 'user-123';
  const mockCompanyId = 'company-123';
  const mockDomainId = 'domain-123';
  const mockDomain = 'example.com';
  const mockToken = 'verification-token-123';
  
  const mockUser = { id: mockUserId };
  const mockDomainRecord = { 
    id: mockDomainId, 
    company_id: mockCompanyId, 
    domain: mockDomain,
    is_verified: false,
    verification_token: mockToken,
    verification_method: 'dns_txt'
  };
  
  let supabase: any;
  const service: any = { checkDomainVerification: vi.fn() };
  
  beforeEach(() => {
    supabase = getServiceSupabase();
    vi.resetAllMocks();
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    vi.mocked(getApiCompanyService).mockReturnValue(service);
    service.checkDomainVerification.mockResolvedValue({ verified: true, message: 'ok' });

    (dns.resolveTxt as any).mockResolvedValue([[mockToken]]);
    
    // Mock DNS resolveTxt to return matching verification token
    (dns.resolveTxt as any).mockResolvedValue([[mockToken]]);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('verifies domain successfully when token is found in DNS records', async () => {
    const request = new NextRequest(
      new URL(`http://localhost/api/company/domains/${mockDomainId}/verify-check`)
    );
    
    const response = await POST(request, { params: Promise.resolve({ id: mockDomainId }) });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.data.verified).toBe(true);
    expect(data.data.message).toContain('verified');
    
    // Verify DNS lookup was called correctly
    expect(dns.resolveTxt).toHaveBeenCalledWith(mockDomain);
    expect(service.checkDomainVerification).toHaveBeenCalledWith(mockDomainId, mockUserId);
  });
  
  test('returns 401 for unauthenticated requests', async () => {
    // Mock authentication failure
    supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid token' } });
    
    const request = new NextRequest(
      new URL(`http://localhost/api/company/domains/${mockDomainId}/verify-check`)
    );
    
    const response = await POST(request, { params: Promise.resolve({ id: mockDomainId }) });
    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
  
  test('returns 404 if domain does not exist', async () => {
    service.checkDomainVerification.mockRejectedValueOnce(new Error('Domain not found'));
    
    const request = new NextRequest(
      new URL(`http://localhost/api/company/domains/${mockDomainId}/verify-check`)
    );
    
    const response = await POST(request, { params: Promise.resolve({ id: mockDomainId }) });
    expect(response.status).toBe(404);
    
    const data = await response.json();
    expect(data.error.message).toContain('not found');
  });
  
  test('returns 400 if verification has not been initiated', async () => {
    service.checkDomainVerification.mockRejectedValueOnce(new Error('Domain verification has not been initiated.'));
    
    const request = new NextRequest(
      new URL(`http://localhost/api/company/domains/${mockDomainId}/verify-check`)
    );
    
    const response = await POST(request, { params: Promise.resolve({ id: mockDomainId }) });
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error.message).toContain('not been initiated');
  });
  
  test('returns unverified status when token is not found in DNS records', async () => {
    // Mock DNS not finding the token
    (dns.resolveTxt as any).mockResolvedValueOnce([['different-token']]);
    
    const request = new NextRequest(
      new URL(`http://localhost/api/company/domains/${mockDomainId}/verify-check`)
    );
    
    const response = await POST(request, { params: Promise.resolve({ id: mockDomainId }) });
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.data.verified).toBe(false);
    expect(data.data.message).toContain('not found');

    // Verify DNS lookup was called
    expect(dns.resolveTxt).toHaveBeenCalledWith(mockDomain);

    expect(service.checkDomainVerification).toHaveBeenCalledWith(mockDomainId, mockUserId);
  });
  
  test('handles DNS resolution errors correctly', async () => {
    // Mock DNS resolution error
    (dns.resolveTxt as any).mockRejectedValueOnce({ code: 'ENOTFOUND' });
    
    const request = new NextRequest(
      new URL(`http://localhost/api/company/domains/${mockDomainId}/verify-check`)
    );
    
    const response = await POST(request, { params: Promise.resolve({ id: mockDomainId }) });
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.data.verified).toBe(false);
    expect(data.data.message).toContain('No TXT records found');
    
    // Verify DNS lookup was called
    expect(dns.resolveTxt).toHaveBeenCalledWith(mockDomain);
  });
  
  test('handles unexpected DNS errors gracefully', async () => {
    // Mock unexpected DNS error
    (dns.resolveTxt as any).mockRejectedValueOnce(new Error('Unexpected DNS error'));
    
    const request = new NextRequest(
      new URL(`http://localhost/api/company/domains/${mockDomainId}/verify-check`)
    );
    
    const response = await POST(request, { params: Promise.resolve({ id: mockDomainId }) });
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.data.verified).toBe(false);
    expect(data.data.message).toContain('error occurred');
  });
  
  test('returns 500 when database update fails', async () => {
    service.checkDomainVerification.mockRejectedValueOnce(new Error('Database error'));
    
    const request = new NextRequest(
      new URL(`http://localhost/api/company/domains/${mockDomainId}/verify-check`)
    );
    
    const response = await POST(request, { params: Promise.resolve({ id: mockDomainId }) });
    expect(response.status).toBe(500);
    
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
}); 