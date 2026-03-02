import { describe, it, expect, beforeEach, vi } from "vitest";
import { DefaultPermissionService } from "../../default-permission.service";
import { PermissionValues, UserRole } from "@/core/permission/models";
import { MemoryCache, MultiLevelCache, RedisCache } from '@/lib/cache';
import { Redis } from '@upstash/redis';
import { logPermissionChange } from '@/lib/audit/permissionAuditLogger';
import { permissionCacheService } from '../../permission-cache.service';


vi.mock('@upstash/redis', () => ({ Redis: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() })) }));
vi.mock('@/lib/audit/permissionAuditLogger', () => ({ logPermissionChange: vi.fn() }));
import { ResourcePermissionResolver } from '@/lib/services/resource-permission-resolver.service';

const USER_ID = "u1";
const ROLE_ID = "r1";

process.env.SUPABASE_SERVICE_ROLE_KEY = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';

describe("DefaultPermissionService", () => {
  let provider: any;
  let resolver: any;
  let service: DefaultPermissionService;

  beforeEach(() => {
    provider = {
      getUserRoles: vi.fn(),
      assignRoleToUser: vi.fn(),
      removeRoleFromUser: vi.fn(),
      getRoleById: vi.fn(),
      assignResourcePermission: vi.fn(),
      removeResourcePermission: vi.fn(),
      getUserResourcePermissions: vi.fn(),
      getPermissionsForResource: vi.fn(),
      getUsersWithResourcePermission: vi.fn(),
    };
    resolver = { getEffectivePermissions: vi.fn().mockResolvedValue([]) } as unknown as ResourcePermissionResolver;
    vi.mocked(logPermissionChange).mockClear();
    service = new DefaultPermissionService(provider, { getEffectivePermissions: vi.fn() } as any, resolver);
    const redis = new Redis({ url: 'x', token: 'x' });
    permissionCacheService.userRoles = new MultiLevelCache(
      new MemoryCache({ ttl: 30000 }),
      new RedisCache<UserRole[]>(redis, { prefix: 'role:' }),
      30000,
    );
    permissionCacheService.resourcePermissions = new MultiLevelCache(
      new MemoryCache({ ttl: 30000 }),
      new RedisCache<boolean>(redis, { prefix: 'res:' }),
      30000,
    );
    permissionCacheService.userPermissions = new MultiLevelCache(
      new MemoryCache({ ttl: 30000 }),
      new RedisCache<boolean>(redis, { prefix: 'perm:' }),
      30000,
    );
  });

  it("returns existing assignment if user already has role", async () => {
    const existing = { id: "ur1", userId: USER_ID, roleId: ROLE_ID };
    provider.getUserRoles.mockResolvedValue([existing]);
    const result = await service.assignRoleToUser(USER_ID, ROLE_ID, "a");
    expect(result).toBe(existing);
    expect(provider.assignRoleToUser).not.toHaveBeenCalled();
  });

  it("assigns role via provider when not assigned", async () => {
    provider.getUserRoles.mockResolvedValue([]);
    const assigned = { id: "ur2", userId: USER_ID, roleId: ROLE_ID };
    provider.assignRoleToUser.mockResolvedValue(assigned);
    const result = await service.assignRoleToUser(USER_ID, ROLE_ID, "a");
    expect(provider.assignRoleToUser).toHaveBeenCalledWith(
      USER_ID,
      ROLE_ID,
      "a",
      undefined,
    );
    expect(result).toBe(assigned);
    expect(logPermissionChange).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ROLE_ASSIGNED' })
    );
  });

  it("removeRoleFromUser returns false if user lacks role", async () => {
    provider.getUserRoles.mockResolvedValue([]);
    const ok = await service.removeRoleFromUser(USER_ID, ROLE_ID);
    expect(ok).toBe(false);
    expect(provider.removeRoleFromUser).not.toHaveBeenCalled();
    expect(logPermissionChange).not.toHaveBeenCalled();
  });

  it("removeRoleFromUser delegates to provider when role exists", async () => {
    provider.getUserRoles.mockResolvedValue([{ roleId: ROLE_ID }]);
    provider.removeRoleFromUser.mockResolvedValue(true);
    const ok = await service.removeRoleFromUser(USER_ID, ROLE_ID);
    expect(provider.removeRoleFromUser).toHaveBeenCalledWith(USER_ID, ROLE_ID);
    expect(ok).toBe(true);
    expect(logPermissionChange).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ROLE_REMOVED' })
    );
  });

  it("roleHasPermission returns false for unknown role", async () => {
    provider.getRoleById.mockResolvedValue(null);
    const has = await service.roleHasPermission(
      ROLE_ID,
      PermissionValues.MANAGE_ROLES,
    );
    expect(has).toBe(false);
  });

  it("roleHasPermission checks permission list", async () => {
    provider.getRoleById.mockResolvedValue({
      id: ROLE_ID,
      name: "ADMIN",
      description: "Admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      permissions: [PermissionValues.MANAGE_ROLES],
    });
    const has = await service.roleHasPermission(
      ROLE_ID,
      PermissionValues.MANAGE_ROLES,
    );
    expect(has).toBe(true);
  });

  it("caches resource permission checks", async () => {
    resolver.getEffectivePermissions.mockResolvedValue([]);
    provider.getUserRoles.mockResolvedValue([]);
    const perm = PermissionValues.VIEW_PROJECTS;
    const allowed1 = await service.hasResourcePermission(USER_ID, perm, 'project', 'p1');
    expect(resolver.getEffectivePermissions).toHaveBeenCalledTimes(1);
    expect(allowed1).toBe(false);
    const allowed2 = await service.hasResourcePermission(USER_ID, perm, 'project', 'p1');
    expect(resolver.getEffectivePermissions).toHaveBeenCalledTimes(1);
    expect(allowed2).toBe(false);
  });

  it("assignResourcePermission invalidates cache", async () => {
    resolver.getEffectivePermissions.mockResolvedValue([PermissionValues.VIEW_PROJECTS]);
    provider.assignResourcePermission.mockResolvedValue({ id: 'rp1' });
    const perm = PermissionValues.VIEW_PROJECTS;
    await service.hasResourcePermission(USER_ID, perm, 'project', 'p1');
    expect(resolver.getEffectivePermissions).toHaveBeenCalledTimes(1);
    await service.assignResourcePermission(USER_ID, perm, 'project', 'p1', 'admin');
    const allowed = await service.hasResourcePermission(USER_ID, perm, 'project', 'p1');
    expect(resolver.getEffectivePermissions).toHaveBeenCalledTimes(2);
    expect(allowed).toBe(true);
  });

  it("addPermissionToRole logs audit entry", async () => {
    provider.addPermissionToRole = vi.fn().mockResolvedValue({ id: 'a1' });
    await service.addPermissionToRole(ROLE_ID, PermissionValues.MANAGE_ROLES);
    expect(provider.addPermissionToRole).toHaveBeenCalledWith(
      ROLE_ID,
      PermissionValues.MANAGE_ROLES,
    );
    expect(logPermissionChange).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PERMISSION_ADDED' })
    );
  });

  it("removePermissionFromRole logs audit entry", async () => {
    provider.removePermissionFromRole = vi.fn().mockResolvedValue(true);
    const ok = await service.removePermissionFromRole(
      ROLE_ID,
      PermissionValues.MANAGE_ROLES,
    );
    expect(ok).toBe(true);
    expect(provider.removePermissionFromRole).toHaveBeenCalledWith(
      ROLE_ID,
      PermissionValues.MANAGE_ROLES,
    );
    expect(logPermissionChange).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PERMISSION_REMOVED' })
    );
  });

  it("hasPermission checks hierarchy and caches result", async () => {
    provider.getUserRoles.mockResolvedValue([{ roleId: ROLE_ID }]);
    const mockRoleService = { getEffectivePermissions: vi.fn().mockResolvedValue([PermissionValues.MANAGE_ROLES]) } as any;
    service = new DefaultPermissionService(provider, mockRoleService);
    const redis = new Redis({ url: 'x', token: 'x' });
    permissionCacheService.userPermissions = new MultiLevelCache(
      new MemoryCache({ ttl: 30000 }),
      new RedisCache<boolean>(redis, { prefix: 'perm:' }),
      30000,
    );

    const allowed1 = await service.hasPermission(USER_ID, PermissionValues.MANAGE_ROLES);
    const allowed2 = await service.hasPermission(USER_ID, PermissionValues.MANAGE_ROLES);

    expect(mockRoleService.getEffectivePermissions).toHaveBeenCalledTimes(1);
    expect(allowed1).toBe(true);
    expect(allowed2).toBe(true);
  });
});
