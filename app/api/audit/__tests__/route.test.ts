import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator';

// Mock auth utilities
vi.mock('@/lib/auth/utils', () => ({
  getUserFromRequest: vi.fn().mockResolvedValue({ id: 'u1', email: 'test@example.com' })
}));

vi.mock('@/lib/auth/hasPermission', () => ({ 
  hasPermission: vi.fn().mockResolvedValue(true) 
}));

// Mock the audit service factory
const mockAuditService = { 
  getLogs: vi.fn() 
};

vi.mock('@/services/audit/factory', () => ({
  getApiAuditService: vi.fn(() => mockAuditService)
}));

import { GET } from '../route';


describe('GET /api/audit', () => {
  const createRequest = (searchParams = '') => 
    new NextRequest(`http://localhost/api/audit${searchParams}`, {
      method: 'GET',
      headers: { 
        'Authorization': 'Bearer test-token'
      }
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditService.getLogs.mockResolvedValue({ logs: [], count: 0 });
  });

  it('returns logs', async () => {
    const res = await GET(createRequest('?page=1&limit=10'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.logs).toEqual([]);
    expect(data.pagination).toBeDefined();
    expect(mockAuditService.getLogs).toHaveBeenCalled();
  });
  
  it('validates query parameters', async () => {
    const res = await GET(createRequest('?page=invalid'));
    expect(res.status).toBe(400);
  });
});
