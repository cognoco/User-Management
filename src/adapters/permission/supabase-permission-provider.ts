/**
 * Supabase Permission Provider Implementation
 * 
 * This file implements the PermissionDataProvider interface using Supabase.
 * It adapts Supabase's database API to the interface required by our core business logic.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Permission, 
  Role, 
  RoleEntity,
  RoleWithPermissions,
  UserRole,
  PermissionAssignment,
  RoleCreationPayload,
  RoleUpdatePayload,
  ResourcePermission
} from '@/core/permission/models';
import type { IPermissionDataProvider } from '@/core/permission/IPermissionDataProvider';
import {
  PermissionEvent,
  PermissionEventHandler,
  PermissionEventTypes,
} from '@/core/permission/events';

/**
 * Supabase implementation of the PermissionDataProvider interface
 */
export class SupabasePermissionProvider implements IPermissionDataProvider {
  private supabase: SupabaseClient;
  private eventHandlers: PermissionEventHandler[] = [];
  
  /**
   * Create a new SupabasePermissionProvider instance
   * 
   * @param supabaseUrl Supabase project URL
   * @param supabaseKey Supabase API key
   */
  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Set up realtime subscription for permission changes
    // This would require setting up Supabase realtime subscriptions
  }
  
  /**
   * Check if a user has a specific permission
   * 
   * @param userId The user ID to check permissions for
   * @param permission The permission to check
   * @returns A boolean indicating if the user has the permission
   */
  async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    // Get all roles assigned to the user
    const { data: userRoles, error: userRolesError } = await this.supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId);
    
    if (userRolesError || !userRoles || userRoles.length === 0) {
      return false;
    }
    
    const roleIds = userRoles.map(ur => ur.role_id);
    
    // Check if any of the user's roles have the permission
    const { data: permissions, error: permissionsError } = await this.supabase
      .from('role_permissions')
      .select('id')
      .in('role_id', roleIds)
      .eq('permission_name', permission as string);
    
    return !permissionsError && !!permissions && permissions.length > 0;
  }
  
  /**
   * Check if a user has a specific role
   * 
   * @param userId The user ID to check roles for
   * @param role The role to check
   * @returns A boolean indicating if the user has the role
   */
  async hasRole(userId: string, role: Role): Promise<boolean> {
    // Look up the role entity by name first, then check user assignment
    const { data: roleEntity, error: roleError } = await this.supabase
      .from('roles')
      .select('id')
      .eq('name', role as string)
      .single();

    if (roleError || !roleEntity) {
      return false;
    }

    const { data, error } = await this.supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role_id', roleEntity.id)
      .single();
    
    return !error && !!data;
  }
  
  /**
   * Get all roles with their permissions
   * 
   * @returns An array of all roles with their permissions
   */
  async getAllRoles(): Promise<RoleWithPermissions[]> {
    // Get all roles
    const { data: roles, error: rolesError } = await this.supabase
      .from('roles')
      .select('*');
    
    if (rolesError || !roles) {
      return [];
    }
    
    // Get all role permissions
    const { data: rolePermissions, error: permissionsError } = await this.supabase
      .from('role_permissions')
      .select('*');
    
    if (permissionsError || !rolePermissions) {
      return roles.map(role => ({
        ...this.mapDbRoleToRole(role),
        permissions: []
      }));
    }
    
    // Map roles with their permissions
    return roles.map(role => {
      const permissions = rolePermissions
        .filter(rp => rp.role_id === role.id)
        .map(this.mapDbPermissionToPermission);
      
      return {
        ...this.mapDbRoleToRole(role),
        permissions
      };
    });
  }
  
  /**
   * Get a specific role by ID
   * 
   * @param roleId The ID of the role to get
   * @returns The role with its permissions, or null if not found
   */
  async getRoleById(roleId: string): Promise<RoleWithPermissions | null> {
    // Get the role
    const { data: role, error: roleError } = await this.supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();
    
    if (roleError || !role) {
      return null;
    }
    
    // Get the role's permissions
    const { data: permissions, error: permissionsError } = await this.supabase
      .from('role_permissions')
      .select('*')
      .eq('role_id', roleId);
    
    return {
      ...this.mapDbRoleToRole(role),
      permissions: permissionsError || !permissions ? [] : permissions.map(this.mapDbPermissionToPermission)
    };
  }
  
  /**
   * Create a new role
   * 
   * @param roleData The data for the new role
   * @returns The created role with its permissions
   */
  async createRole(roleData: RoleCreationPayload): Promise<RoleWithPermissions> {
    // Insert the role
    const { data: role, error: roleError } = await this.supabase
      .from('roles')
      .insert({
        name: roleData.name,
        description: roleData.description,
        is_system_role: roleData.isSystemRole || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (roleError || !role) {
      throw new Error(roleError?.message || 'Failed to create role');
    }
    
    // Add permissions if provided
    let permissions: Permission[] = [];
    
    if (roleData.permissions && roleData.permissions.length > 0) {
      for (const permission of roleData.permissions) {
        await this.addPermissionToRole(role.id, permission);
      }
      
      // Get the role's permissions
      const { data: permissionsData, error: permissionsError } = await this.supabase
        .from('role_permissions')
        .select('*')
        .eq('role_id', role.id);
      
      if (!permissionsError && permissionsData) {
        permissions = permissionsData.map(this.mapDbPermissionToPermission);
      }
    }
    
    const createdRole = {
      ...this.mapDbRoleToRole(role),
      permissions
    };
    
    // Notify event handlers
    this.notifyEvent({
      type: PermissionEventTypes.ROLE_CREATED,
      role: createdRole
    });
    
    return createdRole;
  }
  
  /**
   * Update an existing role
   * 
   * @param roleId The ID of the role to update
   * @param roleData The updated data for the role
   * @returns The updated role with its permissions
   */
  async updateRole(roleId: string, roleData: RoleUpdatePayload): Promise<RoleWithPermissions> {
    // Update the role
    const { data: role, error: roleError } = await this.supabase
      .from('roles')
      .update({
        name: roleData.name,
        description: roleData.description,
        updated_at: new Date().toISOString()
      })
      .eq('id', roleId)
      .select()
      .single();
    
    if (roleError || !role) {
      throw new Error(roleError?.message || 'Failed to update role');
    }
    
    // Update permissions if provided
    if (roleData.permissions) {
      // Get current permissions
      const { data: currentPermissions, error: currentPermissionsError } = await this.supabase
        .from('role_permissions')
        .select('*')
        .eq('role_id', roleId);
      
      if (!currentPermissionsError && currentPermissions) {
        const currentPermissionMap = new Map(
          currentPermissions.map(p => [p.permission_name as string, p])
        );
        
        // Add new permissions and remove old ones
        for (const permission of roleData.permissions) {
          const key = permission as string;
          if (!currentPermissionMap.has(key)) {
            await this.addPermissionToRole(roleId, permission);
          }
          currentPermissionMap.delete(key);
        }
        
        // Remove permissions that are no longer in the list
        for (const [, permission] of currentPermissionMap) {
          await this.removePermissionFromRole(roleId, permission.permission_name as Permission);
        }
      }
    }
    
    // Get the updated role with permissions
    const updatedRole = await this.getRoleById(roleId);
    
    if (!updatedRole) {
      throw new Error('Failed to retrieve updated role');
    }
    
    // Notify event handlers
    this.notifyEvent({
      type: PermissionEventTypes.ROLE_UPDATED,
      role: updatedRole
    });
    
    return updatedRole;
  }
  
  /**
   * Delete a role
   * 
   * @param roleId The ID of the role to delete
   * @returns A boolean indicating if the deletion was successful
   */
  async deleteRole(roleId: string): Promise<boolean> {
    try {
      // Get the role before deletion for event notification
      const role = await this.getRoleById(roleId);
      
      // Delete role permissions first (foreign key constraint)
      await this.supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);
      
      // Delete user roles (foreign key constraint)
      await this.supabase
        .from('user_roles')
        .delete()
        .eq('role_id', roleId);
      
      // Delete the role
      const { error } = await this.supabase
        .from('roles')
        .delete()
        .eq('id', roleId);
      
      if (error) {
        return false;
      }
      
      // Notify event handlers if role existed
      if (role) {
        this.notifyEvent({
          type: PermissionEventTypes.ROLE_DELETED,
          role
        });
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get all roles assigned to a user
   * 
   * @param userId The ID of the user to get roles for
   * @returns An array of user role assignments
   */
  async getUserRoles(userId: string): Promise<UserRole[]> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .select('*, roles(name, description)')
      .eq('user_id', userId);
    
    if (error || !data) {
      return [];
    }
    
    return data.map(this.mapDbUserRoleToUserRole);
  }
  
  /**
   * Assign a role to a user
   * 
   * @param userId The ID of the user to assign the role to
   * @param roleId The ID of the role to assign
   * @param assignedBy The ID of the user assigning the role
   * @param expiresAt Optional expiration date for the role assignment
   * @returns The created user role assignment
   */
  async assignRoleToUser(
    userId: string, 
    roleId: string, 
    assignedBy: string, 
    expiresAt?: Date
  ): Promise<UserRole> {
    // Check if the role exists
    const role = await this.getRoleById(roleId);
    
    if (!role) {
      throw new Error('Role not found');
    }
    
    // Insert the user role
    const { data, error } = await this.supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleId,
        assigned_by: assignedBy,
        expires_at: expiresAt?.toISOString(),
        created_at: new Date().toISOString()
      })
      .select('*, roles(name, description)')
      .single();
    
    if (error || !data) {
      throw new Error(error?.message || 'Failed to assign role to user');
    }
    
    const userRole = this.mapDbUserRoleToUserRole(data);
    
    // Notify event handlers
    this.notifyEvent({
      type: PermissionEventTypes.ROLE_ASSIGNED,
      userRole,
      userId
    });
    
    return userRole;
  }
  
  /**
   * Remove a role from a user
   * 
   * @param userId The ID of the user to remove the role from
   * @param roleId The ID of the role to remove
   * @returns A boolean indicating if the removal was successful
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<boolean> {
    try {
      // Get the user role before deletion for event notification
      const { data: userRole, error: userRoleError } = await this.supabase
        .from('user_roles')
        .select('*, roles(name, description)')
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .single();
      
      // Delete the user role
      const { error } = await this.supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId);
      
      if (error) {
        return false;
      }
      
      // Notify event handlers if user role existed
      if (!userRoleError && userRole) {
        this.notifyEvent({
          type: PermissionEventTypes.ROLE_REMOVED,
          userRole: this.mapDbUserRoleToUserRole(userRole),
          userId
        });
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Check if a role has a specific permission
   * 
   * @param roleId The ID of the role to check
   * @param permission The permission to check for
   * @returns A boolean indicating if the role has the permission
   */
  async roleHasPermission(roleId: string, permission: Permission): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('role_permissions')
      .select('id')
      .eq('role_id', roleId)
      .eq('permission_name', permission as string)
      .single();
    
    return !error && !!data;
  }
  
  /**
   * Add a permission to a role
   * 
   * @param roleId The ID of the role to add the permission to
   * @param permission The permission to add
   * @returns The updated permission assignment
   */
  async addPermissionToRole(roleId: string, permission: Permission): Promise<PermissionAssignment> {
    // Check if the permission already exists
    const exists = await this.roleHasPermission(roleId, permission);
    
    if (exists) {
      // Get the existing permission assignment
      const { data, error } = await this.supabase
        .from('role_permissions')
        .select('*')
        .eq('role_id', roleId)
        .eq('permission_name', permission as string)
        .single();
      
      if (error || !data) {
        throw new Error(error?.message || 'Failed to retrieve permission assignment');
      }
      
      return this.mapDbPermissionAssignmentToPermissionAssignment(data);
    }
    
    // Insert the permission assignment
    const { data, error } = await this.supabase
      .from('role_permissions')
      .insert({
        role_id: roleId,
        permission_name: permission as string,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(error?.message || 'Failed to add permission to role');
    }
    
    const permissionAssignment = this.mapDbPermissionAssignmentToPermissionAssignment(data);
    
    // Notify event handlers
    this.notifyEvent({
      type: PermissionEventTypes.PERMISSION_ADDED,
      permission,
      roleId
    });
    
    return permissionAssignment;
  }
  
  /**
   * Remove a permission from a role
   * 
   * @param roleId The ID of the role to remove the permission from
   * @param permission The permission to remove
   * @returns A boolean indicating if the removal was successful
   */
  async removePermissionFromRole(roleId: string, permission: Permission): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)
        .eq('permission_name', permission as string);
      
      if (error) {
        return false;
      }
      
      // Notify event handlers
      this.notifyEvent({
        type: PermissionEventTypes.PERMISSION_REMOVED,
        permission,
        roleId
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }

  async assignResourcePermission(
    userId: string,
    permission: Permission,
    resourceType: string,
    resourceId: string,
  ): Promise<ResourcePermission> {
    const { data, error } = await this.supabase
      .from('resource_permissions')
      .insert({
        user_id: userId,
        permission_name: permission as string,
        resource_type: resourceType,
        resource_id: resourceId,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (error || !data) {
      throw new Error(error?.message || 'assign failed');
    }
    return {
      id: data.id,
      userId: data.user_id,
      permission,
      resourceType: data.resource_type,
      resourceId: data.resource_id,
      createdAt: new Date(data.created_at),
    };
  }

  async removeResourcePermission(
    userId: string,
    permission: Permission,
    resourceType: string,
    resourceId: string,
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('resource_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('permission_name', permission as string)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId);
    return !error;
  }

  async hasResourcePermission(
    userId: string,
    permission: Permission,
    resourceType: string,
    resourceId: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('resource_permissions')
      .select('id')
      .eq('user_id', userId)
      .eq('permission_name', permission as string)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .single();
    return !error && !!data;
  }

  async getUserResourcePermissions(userId: string): Promise<ResourcePermission[]> {
    const { data, error } = await this.supabase
      .from('resource_permissions')
      .select('*')
      .eq('user_id', userId);
    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id,
      userId: d.user_id,
      permission: d.permission_name as Permission,
      resourceType: d.resource_type,
      resourceId: d.resource_id,
      createdAt: new Date(d.created_at),
    }));
  }

  async getPermissionsForResource(
    resourceType: string,
    resourceId: string,
  ): Promise<ResourcePermission[]> {
    const { data, error } = await this.supabase
      .from('resource_permissions')
      .select('*')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId);
    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id,
      userId: d.user_id,
      permission: d.permission_name as Permission,
      resourceType: d.resource_type,
      resourceId: d.resource_id,
      createdAt: new Date(d.created_at),
    }));
  }

  async getUsersWithResourcePermission(
    resourceType: string,
    resourceId: string,
    permission: Permission,
  ): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('resource_permissions')
      .select('user_id')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .eq('permission_name', permission as string);
    if (error || !data) return [];
    return data.map((d: any) => d.user_id);
  }
  
  /**
   * Get all permissions in the system
   * 
   * @returns An array of all available permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    const { data, error } = await this.supabase
      .from('permissions')
      .select('*');
    
    if (error || !data) {
      return [];
    }
    
    return data.map(this.mapDbPermissionDefinitionToPermission);
  }
  
  /**
   * Get all permissions assigned to a role
   * 
   * @param roleId The ID of the role to get permissions for
   * @returns An array of permissions assigned to the role
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const { data, error } = await this.supabase
      .from('role_permissions')
      .select('*')
      .eq('role_id', roleId);
    
    if (error || !data) {
      return [];
    }
    
    return data.map(this.mapDbPermissionToPermission);
  }
  
  /**
   * Sync role permissions with the database
   * This ensures the database matches the defined permissions
   * 
   * @returns A boolean indicating if the sync was successful
   */
  async syncRolePermissions(): Promise<boolean> {
    try {
      // This would typically be a more complex operation that ensures
      // all system-defined permissions are properly registered in the database
      // For now, we'll just return true
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Subscribe to permission events
   * 
   * @param handler Function to call when a permission event occurs
   * @returns Unsubscribe function
   */
  onPermissionEvent(handler: PermissionEventHandler): () => void {
    this.eventHandlers.push(handler);
    
    // Return unsubscribe function
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index !== -1) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }
  
  /**
   * Notify all event handlers of a permission event
   * 
   * @param event Permission event
   */
  private notifyEvent(event: PermissionEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }
  
  /**
   * Map a database role record to a Role model
   * 
   * @param dbRole Database role record
   * @returns Role model
   */
  private mapDbRoleToRole(dbRole: any): RoleEntity {
    return {
      id: dbRole.id,
      name: dbRole.name,
      description: dbRole.description,
      isSystemRole: dbRole.is_system_role,
      createdAt: new Date(dbRole.created_at),
      updatedAt: new Date(dbRole.updated_at)
    };
  }
  
  /**
   * Map a database permission record to a Permission model
   * 
   * @param dbPermission Database permission record
   * @returns Permission model (string literal)
   */
  private mapDbPermissionToPermission(dbPermission: any): Permission {
    return dbPermission.permission_name as Permission;
  }
  
  /**
   * Map a database permission definition to a Permission model
   * 
   * @param dbPermissionDef Database permission definition
   * @returns Permission model (string literal)
   */
  private mapDbPermissionDefinitionToPermission(dbPermissionDef: any): Permission {
    return dbPermissionDef.name as Permission;
  }
  
  /**
   * Map a database user role record to a UserRole model
   * 
   * @param dbUserRole Database user role record
   * @returns UserRole model
   */
  private mapDbUserRoleToUserRole(dbUserRole: any): UserRole {
    return {
      id: dbUserRole.id,
      userId: dbUserRole.user_id,
      roleId: dbUserRole.role_id,
      role: dbUserRole.roles ? {
        id: dbUserRole.role_id,
        name: dbUserRole.roles.name || '',
        description: dbUserRole.roles.description || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      } : undefined,
      assignedBy: dbUserRole.assigned_by,
      createdAt: new Date(dbUserRole.created_at),
      expiresAt: dbUserRole.expires_at ? new Date(dbUserRole.expires_at) : undefined
    };
  }
  
  /**
   * Map a database permission assignment record to a PermissionAssignment model
   * 
   * @param dbPermissionAssignment Database permission assignment record
   * @returns PermissionAssignment model
   */
  private mapDbPermissionAssignmentToPermissionAssignment(dbPermissionAssignment: any): PermissionAssignment {
    return {
      id: dbPermissionAssignment.id,
      roleId: dbPermissionAssignment.role_id,
      permission: dbPermissionAssignment.permission_name as Permission,
      createdAt: new Date(dbPermissionAssignment.created_at)
    };
  }
}
