/**
 * Default Permission Service Implementation
 *
 * This file implements the PermissionService interface defined in the core layer.
 * It provides the default implementation for permission and role management operations.
 */

import { PermissionService } from "@/core/permission/interfaces";
import {
  Permission,
  Role,
  RoleWithPermissions,
  UserRole,
  PermissionAssignment,
  RoleCreationPayload,
  RoleUpdatePayload,
  DefaultRoleDefinitions,
  ResourcePermission,
} from "@/core/permission/models";
import {
  PermissionEventTypes,
  PermissionEventHandler,
  PermissionEvent,
} from "@/core/permission/events";
import type { IPermissionDataProvider as PermissionDataProvider } from "@/core/permission/IPermissionDataProvider";
import { translateError } from "@/lib/utils/error";
import { TypedEventEmitter } from "@/lib/utils/typed-event-emitter";
import { permissionCacheService } from './permission-cache.service';
import { RoleService } from '@/services/role';
import { ResourcePermissionResolver } from '@/lib/services/resource-permission-resolver.service';
import { logPermissionChange } from '@/lib/audit/permissionAuditLogger';
import { PermissionPolicyService } from '@/lib/services/permission-policy.service';

/**
 * Default implementation of the PermissionService interface
 */
export class DefaultPermissionService
  extends TypedEventEmitter<PermissionEvent>
  implements PermissionService
{

  private roleService: RoleService;
  private resourcePermissionResolver: ResourcePermissionResolver;
  private policyService: PermissionPolicyService;
  /**
   * Constructor for DefaultPermissionService
   *
   * @param permissionDataProvider - The data provider for permission operations
   */
  constructor(
    private permissionDataProvider: PermissionDataProvider,
    roleService: RoleService = new RoleService(),
    resourceResolver: ResourcePermissionResolver = new ResourcePermissionResolver(),
    policyService: PermissionPolicyService = new PermissionPolicyService(),
  ) {
    super();
    this.roleService = roleService;
    this.resourcePermissionResolver = resourceResolver;
    this.policyService = policyService;
  }

  /**
   * Emit a permission event
   *
   * @param event - The event to emit
   */
  private emitEvent(event: PermissionEvent): void {
    this.emit(event);
  }

  private cacheKey(
    userId: string,
    permission: Permission,
    resourceType: string,
    resourceId: string,
  ): string {
    return `${userId}:${permission}:${resourceType}:${resourceId}`;
  }

  /**
   * Check if a user has a specific permission
   *
   * @param userId - The user ID to check permissions for
   * @param permission - The permission to check
   * @returns A boolean indicating if the user has the permission
   */
  async hasPermission(
    userId: string,
    permission: Permission,
  ): Promise<boolean> {
    const cacheKey = `${userId}:${permission}`;
    return permissionCacheService.userPermissions.getOrCreate(cacheKey, async () => {
      try {
        const userRoles = await this.getUserRoles(userId);
        for (const userRole of userRoles) {
          const perms = await this.roleService.getEffectivePermissions(userRole.roleId);
          if ((perms as string[]).includes(permission as string)) {
            return true;
          }
        }
        return false;
      } catch (error) {
        console.error("Error checking user permission:", error);
        return false;
      }
    });
  }

  /**
   * Check if a user has a specific role
   *
   * @param userId - The user ID to check roles for
   * @param role - The role to check
   * @returns A boolean indicating if the user has the role
   */
  async hasRole(userId: string, role: Role): Promise<boolean> {
    try {
      // Get all roles assigned to the user
      const userRoles = await this.getUserRoles(userId);

      // Get the role entity for the specified role
      const roles = await this.getAllRoles();
      const roleEntity = roles.find((r) => r.name === role);

      if (!roleEntity) {
        return false;
      }

      // Check if the user has the role
      return userRoles.some((userRole) => userRole.roleId === roleEntity.id);
    } catch (error) {
      console.error("Error checking user role:", error);
      return false;
    }
  }

  /**
   * Get all roles with their permissions
   *
   * @returns An array of all roles with their permissions
   */
  async getAllRoles(): Promise<RoleWithPermissions[]> {
    try {
      return await this.permissionDataProvider.getAllRoles();
    } catch (error) {
      const errorMessage = translateError(error, {
        defaultMessage: "Error getting all roles",
      });
      console.error("Error getting all roles:", errorMessage);
      return [];
    }
  }

  /**
   * Get a specific role by ID
   *
   * @param roleId - The ID of the role to get
   * @returns The role with its permissions, or null if not found
   */
  async getRoleById(roleId: string): Promise<RoleWithPermissions | null> {
    try {
      return await this.permissionDataProvider.getRoleById(roleId);
    } catch (error) {
      const errorMessage = translateError(error, {
        defaultMessage: "Error getting role by ID",
      });
      console.error("Error getting role by ID:", errorMessage);
      return null;
    }
  }

  /**
   * Create a new role
   *
   * @param roleData - The data for the new role
   * @returns The created role with its permissions
   */
  async createRole(
    roleData: RoleCreationPayload,
    performedBy?: string,
    reason?: string,
    ticket?: string,
  ): Promise<RoleWithPermissions> {
    try {
      const role = await this.permissionDataProvider.createRole(roleData);

      // Emit role created event
      this.emitEvent({
        type: PermissionEventTypes.ROLE_CREATED,
        timestamp: new Date(),
        role,
      });

      await logPermissionChange({
        action: 'ROLE_CREATED',
        performedBy,
        targetType: 'role',
        targetId: role.id,
        after: role,
        reason,
        ticket,
      });

      return role;
    } catch (error) {
      const errorMessage = translateError(error, {
        defaultMessage: "Failed to create role",
      });
      console.error("Error creating role:", errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Update an existing role
   *
   * @param roleId - The ID of the role to update
   * @param roleData - The updated data for the role
   * @returns The updated role with its permissions
   */
  async updateRole(
    roleId: string,
    roleData: RoleUpdatePayload,
    performedBy?: string,
    reason?: string,
    ticket?: string,
  ): Promise<RoleWithPermissions> {
    try {
      // Get the previous role for the event
      const previousRole = await this.getRoleById(roleId);

      if (!previousRole) {
        throw new Error("Role not found");
      }

      const role = await this.permissionDataProvider.updateRole(
        roleId,
        roleData,
      );

      // Emit role updated event
      this.emitEvent({
        type: PermissionEventTypes.ROLE_UPDATED,
        timestamp: new Date(),
        role,
        previousRole,
      });

      await logPermissionChange({
        action: 'ROLE_UPDATED',
        performedBy,
        targetType: 'role',
        targetId: roleId,
        before: previousRole,
        after: role,
        reason,
        ticket,
      });

      return role;
    } catch (error) {
      const errorMessage = translateError(error, {
        defaultMessage: "Failed to update role",
      });
      console.error("Error updating role:", errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete a role
   *
   * @param roleId - The ID of the role to delete
   * @returns A boolean indicating if the deletion was successful
   */
  async deleteRole(
    roleId: string,
    performedBy?: string,
    reason?: string,
    ticket?: string,
  ): Promise<boolean> {
    try {
      const role = await this.permissionDataProvider.getRoleById(roleId);
      await this.permissionDataProvider.deleteRole(roleId);

      // Emit role deleted event
      this.emitEvent({
        type: PermissionEventTypes.ROLE_DELETED,
        timestamp: new Date(),
        roleId,
      });

      await logPermissionChange({
        action: 'ROLE_DELETED',
        performedBy,
        targetType: 'role',
        targetId: roleId,
        before: role ?? { id: roleId },
        reason,
        ticket,
      });

      return true;
    } catch (error) {
      const errorMessage = translateError(error, {
        defaultMessage: "Error deleting role",
      });
      console.error("Error deleting role:", errorMessage);
      return false;
    }
  }

  /**
   * Get all roles assigned to a user
   *
   * @param userId - The ID of the user to get roles for
   * @returns An array of user role assignments
   */
  async getUserRoles(userId: string): Promise<UserRole[]> {
    try {
      return await permissionCacheService.userRoles.getOrCreate(userId, () =>
        this.permissionDataProvider.getUserRoles(userId)
      );
    } catch (error) {
      const errorMessage = translateError(error, {
        defaultMessage: "Error getting user roles",
      });
      console.error("Error getting user roles:", errorMessage);
      permissionCacheService.clearUser(userId);
      return [];
    }
  }

  /**
   * Assign a role to a user
   *
   * @param userId - The ID of the user to assign the role to
   * @param roleId - The ID of the role to assign
   * @param assignedBy - The ID of the user assigning the role
   * @param expiresAt - Optional expiration date for the role assignment
   * @returns The created user role assignment
   */
  async assignRoleToUser(
    userId: string,
    roleId: string,
    assignedBy: string,
    expiresAt?: Date,
  ): Promise<UserRole> {
    try {
      const existingRoles = await this.getUserRoles(userId);
      const existing = existingRoles.find((r) => r.roleId === roleId);

      if (existing) {
        return existing;
      }

      const role = await this.permissionDataProvider.getRoleById(roleId);
      const violation = await this.policyService.checkRoleAssignment(
        assignedBy,
        userId,
        role?.name || ''
      );
      if (violation) {
        await this.policyService.reportViolations([violation]);
        throw new Error(violation.reason);
      }

      const userRole = await this.permissionDataProvider.assignRoleToUser(
        userId,
        roleId,
        assignedBy,
        expiresAt,
      );

      // Emit role assigned event
      this.emitEvent({
        type: PermissionEventTypes.ROLE_ASSIGNED,
        timestamp: new Date(),
        userRole,
      });
await logPermissionChange({
        action: 'ROLE_ASSIGNED',
        performedBy: assignedBy,
        targetType: 'user',
        targetId: userId,
        after: userRole
      });
      
      permissionCacheService.clearUser(userId);

      return userRole;
    } catch (error) {
      const errorMessage = translateError(error, {
        defaultMessage: "Failed to assign role to user",
      });
      console.error("Error assigning role to user:", errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Remove a role from a user
   *
   * @param userId - The ID of the user to remove the role from
   * @param roleId - The ID of the role to remove
   * @returns A boolean indicating if the removal was successful
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<boolean> {
    try {
      const currentRoles = await this.getUserRoles(userId);
      const hasRole = currentRoles.some((r) => r.roleId === roleId);

      if (!hasRole) {
        return false;
      }

      await this.permissionDataProvider.removeRoleFromUser(userId, roleId);

      // Emit role removed event
      this.emitEvent({
        type: PermissionEventTypes.ROLE_REMOVED,
        timestamp: new Date(),
        userId,
        roleId,
      });

await logPermissionChange({
        action: 'ROLE_REMOVED',
        performedBy: undefined,
        targetType: 'user',
        targetId: userId,
        before: { roleId }
      });
      
      permissionCacheService.clearUser(userId);

      return true;
    } catch (error) {
      const errorMessage = translateError(error, {
        defaultMessage: "Error removing role from user",
      });
      console.error("Error removing role from user:", errorMessage);
      return false;
    }
  }

  /**
   * Check if a role has a specific permission
   *
   * @param roleId - The ID of the role to check
   * @param permission - The permission to check for
   * @returns A boolean indicating if the role has the permission
   */
  async roleHasPermission(
    roleId: string,
    permission: Permission,
  ): Promise<boolean> {
    try {
      const role = await this.getRoleById(roleId);

      if (!role) {
        return false;
      }

      return role.permissions.includes(permission);
    } catch (error) {
      console.error("Error checking role permission:", error);
      return false;
    }
  }

  /**
   * Add a permission to a role
   *
   * @param roleId - The ID of the role to add the permission to
   * @param permission - The permission to add
   * @returns The updated permission assignment
   */
  async addPermissionToRole(
    roleId: string,
    permission: Permission,
  ): Promise<PermissionAssignment> {
    try {
      const role = await this.permissionDataProvider.getRoleById(roleId);
      const violation = await this.policyService.checkRolePermissionAssignment(
        role?.name || '',
        permission,
      );
      if (violation) {
        await this.policyService.reportViolations([violation]);
        throw new Error(violation.reason);
      }
      const permissionAssignment =
        await this.permissionDataProvider.addPermissionToRole(
          roleId,
          permission,
        );

      // Emit permission added event
      this.emitEvent({
        type: PermissionEventTypes.PERMISSION_ADDED,
        timestamp: new Date(),
        roleId,
        permission,
      });

      await logPermissionChange({
        action: 'PERMISSION_ADDED',
        performedBy: undefined,
        targetType: 'role',
        targetId: roleId,
        after: { permission }
      });

      return permissionAssignment;
    } catch (error) {
      const errorMessage = translateError(error, {
        defaultMessage: "Failed to add permission to role",
      });
      console.error("Error adding permission to role:", errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Remove a permission from a role
   *
   * @param roleId - The ID of the role to remove the permission from
   * @param permission - The permission to remove
   * @returns A boolean indicating if the removal was successful
   */
  async removePermissionFromRole(
    roleId: string,
    permission: Permission,
  ): Promise<boolean> {
    try {
      await this.permissionDataProvider.removePermissionFromRole(
        roleId,
        permission,
      );

      // Emit permission removed event
      this.emitEvent({
        type: PermissionEventTypes.PERMISSION_REMOVED,
        timestamp: new Date(),
        roleId,
        permission,
      });

      await logPermissionChange({
        action: 'PERMISSION_REMOVED',
        performedBy: undefined,
        targetType: 'role',
        targetId: roleId,
        before: { permission }
      });

      return true;
    } catch (error) {
      const errorMessage = translateError(error, {
        defaultMessage: "Error removing permission from role",
      });
      console.error("Error removing permission from role:", errorMessage);
      return false;
    }
  }

  async assignResourcePermission(
    userId: string,
    permission: Permission,
    resourceType: string,
    resourceId: string,
    performedBy?: string,
    reason?: string,
    ticket?: string,
  ): Promise<ResourcePermission> {
    const violation = await this.policyService.checkResourcePermissionAssignment(
      userId,
      permission,
      resourceType,
    );
    if (violation) {
      await this.policyService.reportViolations([violation]);
      throw new Error(violation.reason);
    }
    const rp = await this.permissionDataProvider.assignResourcePermission(
      userId,
      permission,
      resourceType,
      resourceId,
    );
    permissionCacheService.resourcePermissions.delete(
      this.cacheKey(userId, permission, resourceType, resourceId),
    );

    await logPermissionChange({
      action: 'RESOURCE_PERMISSION_ASSIGNED',
      performedBy,
      targetType: resourceType,
      targetId: resourceId,
      after: { userId, permission },
      reason,
      ticket,
    });
    return rp;
  }

  async removeResourcePermission(
    userId: string,
    permission: Permission,
    resourceType: string,
    resourceId: string,
    performedBy?: string,
    reason?: string,
    ticket?: string,
  ): Promise<boolean> {
    const ok = await this.permissionDataProvider.removeResourcePermission(
      userId,
      permission,
      resourceType,
      resourceId,
    );
    permissionCacheService.resourcePermissions.delete(
      this.cacheKey(userId, permission, resourceType, resourceId),
    );

    if (ok) {
      await logPermissionChange({
        action: 'RESOURCE_PERMISSION_REMOVED',
        performedBy,
        targetType: resourceType,
        targetId: resourceId,
        before: { userId, permission },
        reason,
        ticket,
      });
    }
    return ok;
  }

  async hasResourcePermission(
    userId: string,
    permission: Permission,
    resourceType: string,
    resourceId: string,
  ): Promise<boolean> {
    const key = this.cacheKey(userId, permission, resourceType, resourceId);
    return permissionCacheService.resourcePermissions.getOrCreate(key, async () => {
      const effectivePermissions = await this.resourcePermissionResolver.getEffectivePermissions(
        userId,
        resourceType,
        resourceId,
      );
      return effectivePermissions.includes(permission);
    });
  }

  async getUserResourcePermissions(userId: string): Promise<ResourcePermission[]> {
    return this.permissionDataProvider.getUserResourcePermissions(userId);
  }

  async getPermissionsForResource(
    resourceType: string,
    resourceId: string,
  ): Promise<ResourcePermission[]> {
    return this.permissionDataProvider.getPermissionsForResource(resourceType, resourceId);
  }

  async getUsersWithResourcePermission(
    resourceType: string,
    resourceId: string,
    permission: Permission,
  ): Promise<string[]> {
    return this.permissionDataProvider.getUsersWithResourcePermission(
      resourceType,
      resourceId,
      permission,
    );
  }

  /**
   * Get all permissions in the system
   *
   * @returns An array of all available permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    try {
      return await this.permissionDataProvider.getAllPermissions();
    } catch (error) {
      const errorMessage = translateError(error, {
        defaultMessage: "Error getting all permissions",
      });
      console.error("Error getting all permissions:", errorMessage);
      return [];
    }
  }

  /**
   * Get all permissions assigned to a role
   *
   * @param roleId - The ID of the role to get permissions for
   * @returns An array of permissions assigned to the role
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    try {
      return await this.permissionDataProvider.getRolePermissions(roleId);
    } catch (error) {
      const errorMessage = translateError(error, {
        defaultMessage: "Error getting role permissions",
      });
      console.error("Error getting role permissions:", errorMessage);
      return [];
    }
  }

  /**
   * Sync role permissions with the database
   * This ensures the database matches the defined permissions
   *
   * @returns A boolean indicating if the sync was successful
   */
  async syncRolePermissions(): Promise<boolean> {
    try {
      // Get all existing roles
      const existingRoles = await this.getAllRoles();

      // For each default role definition
      for (const [roleName, permissions] of Object.entries(
        DefaultRoleDefinitions,
      )) {
        // Check if the role exists
        const existingRole = existingRoles.find(
          (role) => role.name === roleName,
        );

        if (existingRole) {
          // Update existing role permissions
          const currentPermissions = await this.getRolePermissions(
            existingRole.id,
          );

          // Add missing permissions
          for (const permission of permissions) {
            if (!currentPermissions.includes(permission)) {
              await this.addPermissionToRole(existingRole.id, permission);
            }
          }

          // Remove extra permissions
          for (const permission of currentPermissions) {
            if (!permissions.includes(permission)) {
              await this.removePermissionFromRole(existingRole.id, permission);
            }
          }
        } else {
          // Create new role with default permissions
          await this.createRole({
            name: roleName,
            description: `Default ${roleName} role`,
            permissions,
          });
        }
      }

      // Get updated roles
      const updatedRoles = await this.getAllRoles();

      // Emit role permissions synced event
      this.emitEvent({
        type: PermissionEventTypes.ROLE_PERMISSIONS_SYNCED,
        timestamp: new Date(),
        roles: updatedRoles,
      });

      return true;
    } catch (error) {
      console.error("Error syncing role permissions:", error);
      return false;
    }
  }

  /**
   * Subscribe to permission events
   *
   * @param handler - Function to call when a permission event occurs
   * @returns Unsubscribe function
   */
  onPermissionEvent(handler: PermissionEventHandler): () => void {
    return this.on(handler);
  }
}
