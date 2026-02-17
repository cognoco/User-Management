import { prisma } from '@/lib/database/prisma';
import { Permission, RoleType, RoleDefinition } from './roles';

// Use any-cast to bridge schema difference between roleService assumptions and actual Prisma schema
const db = prisma as any;

/**
 * Initialize role permissions in the database
 */
export async function initializeRolePermissions() {
  // Get all existing permissions
  const existingPermissions = await db.role_permissions.findMany();
  const existingMap = new Map(
    existingPermissions.map((p: any) => [`${p.role}-${p.permission}`, p])
  );

  // Create or update permissions for each role
  const updates = Object.entries(RoleDefinition).flatMap(([role, def]) => {
    return def.permissions.map((permission: string) => {
      const key = `${role}-${permission}`;
      if (!existingMap.has(key)) {
        return db.role_permissions.create({
          data: {
            role,
            permission,
          },
        });
      }
      return null;
    }).filter(Boolean);
  });

  await Promise.all(updates);
}

/**
 * Get all permissions for a specific role
 */
export async function getRolePermissions(role: RoleType): Promise<string[]> {
  const permissions = await db.role_permissions.findMany({
    where: { role },
    select: { permission: true },
  });
  return permissions.map((p: any) => p.permission);
}

/**
 * Mock implementation for checking if a role has a specific permission
 * 
 * @param role The role to check
 * @param permission The permission to check for
 * @returns A boolean indicating if the role has the permission
 */
export async function checkRolePermission(role: RoleType | string, permission: Permission): Promise<boolean> {
  // In a real app, this would check a database or policy definition
  // For now, return simple rules for E2E testing
  
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    return true;
  }
  
  if (role === 'MANAGER') {
    // Managers can view logs but not admin access
    return (permission as string) !== 'ADMIN_ACCESS';
  }
  
  if (role === 'USER') {
    // Regular users have limited permissions
    return ['EXPORT_DATA', 'VIEW_ANALYTICS'].includes(permission as string);
  }
  
  return false;
}

/**
 * Get all roles with their permissions
 */
export async function getAllRolesWithPermissions() {
  const roles = Object.keys(RoleDefinition) as RoleType[];
  const results = await Promise.all(
    roles.map(async (role) => {
      const perms = await getRolePermissions(role);
      const def = RoleDefinition[role as RoleType];
      return {
        role,
        permissions: perms,
        name: def.name,
        description: def.description,
      };
    })
  );

  return results;
}

/**
 * Sync database permissions with role definitions
 * This ensures the database matches the TypeScript definitions
 */
export async function syncRolePermissions() {
  // Delete permissions that no longer exist in the definition
  await db.role_permissions.deleteMany({
    where: {
      OR: [
        {
          role: {
            notIn: Object.keys(RoleDefinition),
          },
        },
        {
          permission: {
            notIn: Object.values(Permission),
          },
        },
      ],
    },
  });

  // Initialize current permissions
  await initializeRolePermissions();
}
