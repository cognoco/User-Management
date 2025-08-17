import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoleService } from '../role.service';
import { getServiceSupabase } from '@/lib/database/supabase';

// Use a shared Supabase mock so tests can control return values
const supabase = {
  from: vi.fn(),
};
vi.mock('@/lib/database/supabase', () => ({
  getServiceSupabase: vi.fn(() => supabase),
}));

// Removed unused mockFrom function

describe('RoleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.from.mockReset();
  });

  it('rejects creating duplicate role names', async () => {
    const supabase = getServiceSupabase();
    (getServiceSupabase as any).mockReturnValue(supabase);
    const from = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'r1' }, error: null }),
    };
    (supabase.from as any).mockReturnValue(from);
    const service = new RoleService();
    await expect(service.createRole('admin', 'desc')).rejects.toThrow('Role name must be unique');
  });

  it('prevents deleting system roles', async () => {
    const supabase = getServiceSupabase();
    (getServiceSupabase as any).mockReturnValue(supabase);
    const fromFirst = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'r1', isSystemRole: true }, error: null }),
    };
    const fromSecond = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    (supabase.from as any)
      .mockReturnValueOnce(fromFirst)
      .mockReturnValueOnce(fromSecond);
    const service = new RoleService();
    await expect(service.deleteRole('r1')).rejects.toThrow('Cannot delete system role');
  });

  it('detects circular hierarchy on update', async () => {
const supabase = getServiceSupabase();
(getServiceSupabase as any).mockReturnValue(supabase);
// unique name check
const nameCheck = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  single: vi.fn().mockRejectedValue({ code: 'PGRST116' }),
};
// circular check: parent role's parent is the role itself
// parentQuery variable removed as it's not used
(supabase.from as any).mockReturnValue(nameCheck);
    vi.spyOn(RoleService.prototype as any, 'hasCircularDependency').mockResolvedValue(true);
    const service = new RoleService();
    await expect(service.updateRole('r1', { parentRoleId: 'r2' })).rejects.toThrow('Circular role hierarchy');
  });

  it('updates parent role via setParentRole', async () => {
    const supabase = getServiceSupabase();
    (getServiceSupabase as any).mockReturnValue(supabase);
    const service = new RoleService();
    const from = { update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) }) };
    (service as any).supabase.from = vi.fn().mockReturnValue(from);
    vi.spyOn(service as any, 'hasCircularDependency').mockResolvedValue(false);
    await service.setParentRole('B', 'A');
    expect(from.update).toHaveBeenCalledWith({ parent_role_id: 'A', updated_at: expect.any(String) });
    const updateObj = (from.update as any).mock.results[0].value;
    expect(updateObj.eq).toHaveBeenCalledWith('id', 'B');
  });

  it('rejects parent role when depth limit exceeded', async () => {
    const supabase = getServiceSupabase();
    const from = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnValue({ error: null }) };
    (supabase.from as any).mockReturnValue(from);
    vi.spyOn(RoleService.prototype as any, 'hasCircularDependency').mockResolvedValue(false);
    vi.spyOn(RoleService.prototype as any, 'exceedsDepthLimit').mockResolvedValue(true);
    const service = new RoleService();
    await expect(service.setParentRole('B', 'A')).rejects.toThrow('Role hierarchy depth limit exceeded');
  });

  it('returns ancestor roles in order', async () => {
    const roles: any = {
      A: { id: 'A', name: 'A', isSystemRole: false, createdAt: '', updatedAt: '', parentRoleId: null },
      B: { id: 'B', name: 'B', isSystemRole: false, createdAt: '', updatedAt: '', parentRoleId: 'A' },
      C: { id: 'C', name: 'C', isSystemRole: false, createdAt: '', updatedAt: '', parentRoleId: 'B' },
    };
    const service = new RoleService();
    vi.spyOn(service, 'getRoleById').mockImplementation(async (id: string) => roles[id] || null);
    const ancestors = await service.getAncestorRoles('C');
    expect(ancestors.map(r => r.id)).toEqual(['B', 'A']);
  });

  it('returns descendant roles', async () => {
    const roles = [
      { id: 'A', name: 'A', isSystemRole: false, createdAt: '', updatedAt: '', parentRoleId: null },
      { id: 'B', name: 'B', isSystemRole: false, createdAt: '', updatedAt: '', parentRoleId: 'A' },
      { id: 'C', name: 'C', isSystemRole: false, createdAt: '', updatedAt: '', parentRoleId: 'B' },
    ];
    const service = new RoleService();
    vi.spyOn(service, 'getAllRoles').mockResolvedValue(roles as any);
    const desc = await service.getDescendantRoles('A');
    expect(desc.map(r => r.id).sort()).toEqual(['B', 'C']);
  });

  it('calculates effective permissions with inheritance', async () => {
    const service = new RoleService();
    vi.spyOn(service, 'getAncestorRoles').mockResolvedValue([
      { id: 'B', name: 'B', isSystemRole: false, createdAt: '', updatedAt: '', parentRoleId: 'A' },
      { id: 'A', name: 'A', isSystemRole: false, createdAt: '', updatedAt: '', parentRoleId: null },
    ] as any);
    const supabase = getServiceSupabase();
    (getServiceSupabase as any).mockReturnValue(supabase);
    const from = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { permissions: 'p1' },
          { permissions: 'p2' },
          { permissions: 'p3' },
          { permissions: 'p4' },
          { permissions: 'p3' },
        ],
        error: null,
      }),
    };
    (supabase.from as any).mockReturnValue(from);
    const perms = await service.getEffectivePermissions('C');
    expect(perms.sort()).toEqual(['p1', 'p2', 'p3', 'p4']);
  });
it('removes parent role via removeParentRole', async () => {
  const service = new RoleService();
  const spy = vi.spyOn(service, 'setParentRole').mockResolvedValue(undefined);
  await service.removeParentRole('B');
  expect(spy).toHaveBeenCalledWith('B', null);
});

it('builds full role hierarchy', async () => {
  const roles = [
    { id: 'A', name: 'A', isSystemRole: false, createdAt: '', updatedAt: '', parentRoleId: null },
    { id: 'B', name: 'B', isSystemRole: false, createdAt: '', updatedAt: '', parentRoleId: 'A' },
    { id: 'C', name: 'C', isSystemRole: false, createdAt: '', updatedAt: '', parentRoleId: 'B' },
  ];
  const service = new RoleService();
  vi.spyOn(service, 'getAllRoles').mockResolvedValue(roles as any);
  const tree = await service.getRoleHierarchy();
  expect(tree).toHaveLength(1);
  expect(tree[0].id).toBe('A');
  expect(tree[0].children[0].id).toBe('B');
  expect(tree[0].children[0].children[0].id).toBe('C');
});

it('caches effective permission results', async () => {
  const service = new RoleService();
  vi.spyOn(service, 'getAncestorRoles').mockResolvedValue([] as any);
  const supabase = getServiceSupabase();
  const from = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: [{ permissions: 'p1' }], error: null }),
  };
  (supabase.from as any).mockReturnValue(from);
  const first = await service.getEffectivePermissions('A');
  const second = await service.getEffectivePermissions('A');
  expect(from.in).toHaveBeenCalledTimes(1);
  expect(first).toEqual(second);
});
});
