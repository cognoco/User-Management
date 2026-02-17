/**
 * Permission Service Interface
 * 
 * This file defines the core interfaces for the permission and role domain.
 * Following the interface-first design principle, these interfaces define
 * the contract that any implementation must fulfill.
 */

import { 
  Permission, 
  Role, 
  RoleWithPermissions, 
  UserRole,
  PermissionAssignment,
  RoleCreationPayload,
  RoleUpdatePayload,
  ResourcePermission,
} from './models';
import { PermissionEventHandler } from './events';

/**
 * Core permission service interface
 *
 * This interface defines all permission and role-related operations that can be performed.
 * Any implementation of this interface must provide all these methods.
 *
 * **Error handling:**
 * Methods return booleans or result objects for known validation errors.
 * Unexpected provider failures should cause the promise to reject.
 */
export interface PermissionService {
  /**
   * Check if a user has a specific permission
   * 
   * @param userId The user ID to check permissions for
   * @param permission The permission to check
   * @returns A boolean indicating if the user has the permission
   */
  hasPermission(userId: string, permission: Permission): Promise<boolean>;
  
  /**
   * Check if a user has a specific role
   * 
   * @param userId The user ID to check roles for
   * @param role The role to check
   * @returns A boolean indicating if the user has the role
   */
  hasRole(userId: string, role: Role): Promise<boolean>;
  
  /**
   * Get all roles with their permissions
   * 
   * @returns An array of all roles with their permissions
   */
  getAllRoles(): Promise<RoleWithPermissions[]>;
  
  /**
   * Get a specific role by ID
   * 
   * @param roleId The ID of the role to get
   * @returns The role with its permissions, or null if not found
   */
  getRoleById(roleId: string): Promise<RoleWithPermissions | null>;
  
  /**
   * Create a new role
   * 
   * @param roleData The data for the new role
   * @returns The created role with its permissions
   */
  createRole(
    roleData: RoleCreationPayload,
    performedBy?: string,
    reason?: string,
    ticket?: string,
  ): Promise<RoleWithPermissions>;
  
  /**
   * Update an existing role
   * 
   * @param roleId The ID of the role to update
   * @param roleData The updated data for the role
   * @returns The updated role with its permissions
   */
  updateRole(
    roleId: string,
    roleData: RoleUpdatePayload,
    performedBy?: string,
    reason?: string,
    ticket?: string,
  ): Promise<RoleWithPermissions>;
  
  /**
   * Delete a role
   * 
   * @param roleId The ID of the role to delete
   * @returns A boolean indicating if the deletion was successful
   */
  deleteRole(
    roleId: string,
    performedBy?: string,
    reason?: string,
    ticket?: string,
  ): Promise<boolean>;
  
  /**
   * Get all roles assigned to a user
   * 
   * @param userId The ID of the user to get roles for
   * @returns An array of user role assignments
   */
  getUserRoles(userId: string): Promise<UserRole[]>;
  
  /**
   * Assign a role to a user
   * 
   * @param userId The ID of the user to assign the role to
   * @param roleId The ID of the role to assign
   * @param assignedBy The ID of the user assigning the role
   * @param expiresAt Optional expiration date for the role assignment
   * @returns The created user role assignment
   */
  assignRoleToUser(
    userId: string, 
    roleId: string, 
    assignedBy: string, 
    expiresAt?: Date
  ): Promise<UserRole>;
  
  /**
   * Remove a role from a user
   * 
   * @param userId The ID of the user to remove the role from
   * @param roleId The ID of the role to remove
   * @returns A boolean indicating if the removal was successful
   */
  removeRoleFromUser(userId: string, roleId: string): Promise<boolean>;
  
  /**
   * Check if a role has a specific permission
   * 
   * @param roleId The ID of the role to check
   * @param permission The permission to check for
   * @returns A boolean indicating if the role has the permission
   */
  roleHasPermission(roleId: string, permission: Permission): Promise<boolean>;
  
  /**
   * Add a permission to a role
   * 
   * @param roleId The ID of the role to add the permission to
   * @param permission The permission to add
   * @returns The updated permission assignment
   */
  addPermissionToRole(roleId: string, permission: Permission): Promise<PermissionAssignment>;
  
  /**
   * Remove a permission from a role
   * 
   * @param roleId The ID of the role to remove the permission from
   * @param permission The permission to remove
   * @returns A boolean indicating if the removal was successful
   */
  removePermissionFromRole(roleId: string, permission: Permission): Promise<boolean>;
  
  /**
   * Get all permissions in the system
   * 
   * @returns An array of all available permissions
   */
  getAllPermissions(): Promise<Permission[]>;
  
  /**
   * Get all permissions assigned to a role
   * 
   * @param roleId The ID of the role to get permissions for
   * @returns An array of permissions assigned to the role
   */
  getRolePermissions(roleId: string): Promise<Permission[]>;

  /**
   * Assign a permission scoped to a specific resource to a user
   */
  assignResourcePermission(
    userId: string,
    permission: Permission,
    resourceType: string,
    resourceId: string,
    performedBy?: string,
    reason?: string,
    ticket?: string,
  ): Promise<ResourcePermission>;

  /**
   * Remove a resource scoped permission from a user
   */
  removeResourcePermission(
    userId: string,
    permission: Permission,
    resourceType: string,
    resourceId: string,
    performedBy?: string,
    reason?: string,
    ticket?: string,
  ): Promise<boolean>;

  /**
   * Check if a user has a permission for a specific resource
   */
  hasResourcePermission(
    userId: string,
    permission: Permission,
    resourceType: string,
    resourceId: string,
  ): Promise<boolean>;

  /** Get all resource permissions for a user */
  getUserResourcePermissions(userId: string): Promise<ResourcePermission[]>;

  /** Get all permissions for a specific resource */
  getPermissionsForResource(
    resourceType: string,
    resourceId: string,
  ): Promise<ResourcePermission[]>;

  /** Get all users with a permission for a resource */
  getUsersWithResourcePermission(
    resourceType: string,
    resourceId: string,
    permission: Permission,
  ): Promise<string[]>;
  
  /**
   * Sync role permissions with the database
   * This ensures the database matches the defined permissions
   * 
   * @returns A boolean indicating if the sync was successful
   */
  syncRolePermissions(): Promise<boolean>;
  
  /**
   * Subscribe to permission events
   * 
   * @param handler Function to call when a permission event occurs
   * @returns Unsubscribe function
   */
  onPermissionEvent(handler: PermissionEventHandler): () => void;
}

/**
 * Permission state interface
 * 
 * This interface defines the permission state that can be observed.
 */
export interface PermissionState {
  /**
   * All roles in the system
   */
  roles: RoleWithPermissions[];
  
  /**
   * All permissions in the system
   */
  permissions: Permission[];
  
  /**
   * True if permission operations are in progress
   */
  isLoading: boolean;
  
  /**
   * Error message if a permission operation failed
   */
  error: string | null;
  
  /**
   * Success message after a successful operation
   */
  successMessage: string | null;
}
