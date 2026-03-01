import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/database/prisma';
import { Permission } from '../roles';
import {
  initializeRolePermissions,
  getRolePermissions,
  checkRolePermission,
  syncRolePermissions,
} from '../roleService';

vi.mock('@/lib/database/prisma', () => ({
  prisma: {
    role_permissions: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// The service casts prisma to `any` as `db`, so our mock on prisma.role_permissions is used.
const db = prisma as any;

describe('Role Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('initializeRolePermissions', () => {
    it('should create missing role permissions', async () => {
      db.role_permissions.findMany.mockResolvedValue([]);
      db.role_permissions.create.mockResolvedValue({} as any);

      await initializeRolePermissions();

      // Should create permissions for all roles
      expect(db.role_permissions.create).toHaveBeenCalled();
    });

    it('should not create existing role permissions', async () => {
      const existingPermission = {
        id: '1',
        role: 'ADMIN',
        permission: Permission.VIEW_TEAM_MEMBERS,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      db.role_permissions.findMany.mockResolvedValue([existingPermission]);
      db.role_permissions.create.mockResolvedValue({} as any);

      await initializeRolePermissions();

      // Should not recreate existing permission
      expect(db.role_permissions.create).not.toHaveBeenCalledWith({
        data: {
          role: 'ADMIN',
          permission: Permission.VIEW_TEAM_MEMBERS,
        },
      });
    });
  });

  describe('getRolePermissions', () => {
    it('should return permissions for a role', async () => {
      const mockPermissions = [
        { permission: Permission.VIEW_TEAM_MEMBERS },
        { permission: Permission.INVITE_TEAM_MEMBER },
      ];

      db.role_permissions.findMany.mockResolvedValue(mockPermissions);

      const permissions = await getRolePermissions('ADMIN');

      expect(permissions).toEqual([
        Permission.VIEW_TEAM_MEMBERS,
        Permission.INVITE_TEAM_MEMBER,
      ]);
      expect(db.role_permissions.findMany).toHaveBeenCalledWith({
        where: { role: 'ADMIN' },
        select: { permission: true },
      });
    });
  });

  describe('checkRolePermission', () => {
    it('should return true when role has permission', async () => {
      // checkRolePermission uses hardcoded logic, not DB — ADMIN always returns true
      const hasPermission = await checkRolePermission(
        'ADMIN',
        Permission.VIEW_TEAM_MEMBERS
      );

      expect(hasPermission).toBe(true);
    });

    it('should return false when role does not have permission', async () => {
      // VIEWER is not in the hardcoded list, so returns false
      const hasPermission = await checkRolePermission(
        'VIEWER',
        Permission.MANAGE_BILLING
      );

      expect(hasPermission).toBe(false);
    });

    it('should return false for unknown role', async () => {
      const hasPermission = await checkRolePermission(
        'UNKNOWN_ROLE',
        Permission.VIEW_TEAM_MEMBERS
      );

      expect(hasPermission).toBe(false);
    });
  });

  describe('syncRolePermissions', () => {
    it('should delete outdated permissions and initialize new ones', async () => {
      db.role_permissions.deleteMany.mockResolvedValue({ count: 1 });
      db.role_permissions.findMany.mockResolvedValue([]);
      db.role_permissions.create.mockResolvedValue({} as any);

      await syncRolePermissions();

      expect(db.role_permissions.deleteMany).toHaveBeenCalled();
      expect(db.role_permissions.findMany).toHaveBeenCalled();
      expect(db.role_permissions.create).toHaveBeenCalled();
    });
  });
});
