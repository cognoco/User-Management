import { describe, it, expect, vi } from 'vitest';

describe('Minimal factory test', () => {
  it('should pass', () => {
    expect(1).toBe(1);
  });
  
  it('can import ServiceLocator', async () => {
    const { ServiceLocator } = await import('@/lib/config/service-locator');
    expect(ServiceLocator).toBeDefined();
  });
  
  it('can import auth factory', async () => {
    // Set env vars first
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    
    const { getApiAuthService } = await import('../factory');
    expect(getApiAuthService).toBeDefined();
  });
});