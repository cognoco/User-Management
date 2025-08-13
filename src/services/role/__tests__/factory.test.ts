import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getApiRoleService } from '../factory';
import { RoleService } from '../role.service';

describe('getApiRoleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set required environment variables
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it('returns new service instance', () => {
    const s1 = getApiRoleService();
    const s2 = getApiRoleService();
    expect(s1).toBeInstanceOf(RoleService);
    expect(s2).toBeInstanceOf(RoleService);
    // Services are now cached as singletons
    expect(s1).toBe(s2);
  });
});
