import { describe, it, expect, beforeEach } from 'vitest';
import { SupabasePermissionProvider } from '../supabase-permission-provider';
import { setTableMockData, resetSupabaseMock } from '@/tests/mocks/supabase';
import type { Permission } from '@/core/permission/models';

const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'test-anon-key';

const userRoles = [
  { user_id: 'user-1', role_id: 'role-1' }
];
const rolePermissions = [
  { id: 'rp1', role_id: 'role-1', permission_name: 'edit', resource: 'doc' }
];

describe('SupabasePermissionProvider', () => {
  beforeEach(() => {
    resetSupabaseMock();
    setTableMockData('user_roles', { data: userRoles, error: null });
    setTableMockData('role_permissions', { data: rolePermissions, error: null });
  });

  it('checks user permission', async () => {
    const provider = new SupabasePermissionProvider(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const perm: Permission = { name: 'edit', resource: 'doc' };
    const result = await provider.hasPermission('user-1', perm);

    expect(result).toBe(true);
  });
});
