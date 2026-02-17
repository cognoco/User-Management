import { supabase } from '@/lib/supabase';
import type { Permission, Role, ResourcePermission } from '@/types/rbac';

// PermissionGroup is not in rbac.ts - define locally
interface PermissionGroup {
  id: string;
  name: string;
  description?: string;
  permissions?: Permission[];
}
import { createRoleHierarchyService } from '@/lib/services/roleHierarchy.service';

const roleHierarchyService = createRoleHierarchyService();

export class PermissionService {
  // Get all permissions
  async getAllPermissions(): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  // Get all permission groups
  async getAllGroups(): Promise<PermissionGroup[]> {
    const { data, error } = await supabase
      .from('permission_groups')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  // Create a permission group
  async createGroup(name: string, description?: string): Promise<PermissionGroup> {
    const { data, error } = await supabase
      .from('permission_groups')
      .insert({ name, description })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get all roles with hierarchy information
  async getAllRoles(): Promise<Role[]> {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('weight', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Get permissions for a role (including inherited permissions)
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    // Get the role and its hierarchy
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*, parent_role_id')
      .eq('id', roleId)
      .single();

    if (roleError) throw roleError;

    // Get direct permissions
    const { data: directPerms, error: directError } = await supabase
      .from('role_permissions')
      .select('permission_id, permissions(*)')
      .eq('role_id', roleId);

    if (directError) throw directError;

    // Recursive function to get parent role permissions
    const getParentPerms = async (parentId?: string): Promise<any[]> => {
      if (!parentId) return [];

      const { data: parentPerms, error: parentError } = await supabase
        .from('role_permissions')
        .select('permission_id, permissions(*)')
        .eq('role_id', parentId);

      if (parentError) throw parentError;

      // Get the parent role to check for its parent
      const { data: parentRole, error: parentRoleError } = await supabase
        .from('roles')
        .select('parent_role_id')
        .eq('id', parentId)
        .single();

      if (parentRoleError) throw parentRoleError;

      // Recursively get permissions from higher up the hierarchy
      const higherPerms = await getParentPerms(parentRole.parent_role_id);
      
      // Combine permissions from this level with higher levels
      return [...(parentPerms?.map(p => p.permissions) || []), ...higherPerms];
    };

    // Get inherited permissions
    const inheritedPerms = await getParentPerms(role.parent_role_id);

    // Combine direct and inherited permissions, removing duplicates
    const allPermissions: any[] = [
      ...(directPerms?.map((p: any) => p.permissions) || []),
      ...inheritedPerms
    ];

    // Remove duplicates by permission ID
    const uniquePerms = Object.values(
      allPermissions.reduce((acc: Record<string, any>, perm: any) => {
        if (perm && perm.id) {
          acc[perm.id] = perm;
        }
        return acc;
      }, {} as Record<string, any>)
    );

    return uniquePerms;
  }

  // Check if user has a specific permission
  async hasPermission(
    userId: string,
    permissionName: string,
    resourceType?: string,
    resourceId?: string,
  ): Promise<boolean> {
    // Get user's roles from mapping table
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId);

    if (roleError) throw roleError;

    if (!userRoles || userRoles.length === 0) return false;

    // Get permission ID
    const { data: permission, error: permError } = await supabase
      .from('permissions')
      .select('id')
      .eq('name', permissionName)
      .single();

    if (permError) return false; // Permission doesn't exist

    // Check for direct resource permission
    if (resourceType && resourceId) {
      const { data: resourcePerm, error: resourceError } = await supabase
        .from('resource_permissions')
        .select('id')
        .eq('user_id', userId)
        .eq('permission_id', permission.id)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .single();
        
      if (!resourceError && resourcePerm) return true;
    }

    // Check permission via role hierarchy
    for (const userRole of userRoles) {
      const perms = await roleHierarchyService.getEffectivePermissions(
        userRole.role_id,
      );
      if (perms.includes(permissionName)) {
        return true;
      }
    }

    return false;
  }

  // Assign permission to a role
  async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    const { error } = await supabase
      .from('role_permissions')
      .insert({ role_id: roleId, permission_id: permissionId });
      
    if (error) throw error;
  }

  // Assign resource-specific permission to a user
  async assignResourcePermission(
    userId: string,
    permissionId: string,
    resourceType: string,
    resourceId: string
  ): Promise<ResourcePermission> {
    const { data, error } = await supabase
      .from('resource_permissions')
      .insert({
        user_id: userId,
        permission_id: permissionId,
        resource_type: resourceType,
        resource_id: resourceId
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  // Remove a resource-specific permission from a user
  async removeResourcePermission(
    userId: string,
    permissionId: string,
    resourceType: string,
    resourceId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('resource_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('permission_id', permissionId)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId);

    if (error) throw error;
  }

  // Check if a user has a permission for a specific resource
  async hasPermissionForResource(
    userId: string,
    permissionId: string,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('resource_permissions')
      .select('id')
      .eq('user_id', userId)
      .eq('permission_id', permissionId)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .single();

    return !error && !!data;
  }
}

export const permissionService = new PermissionService();
