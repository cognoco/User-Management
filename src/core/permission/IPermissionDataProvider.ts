/**
 * Permission Data Provider Interface
 *
 * Defines the contract for persistence operations related to permissions
 * and roles. Implementations of this interface handle all database
 * interactions while keeping the core business logic database agnostic.
 */

import type {
  Permission,
  Role,
  RoleWithPermissions,
  UserRole,
  PermissionAssignment,
  RoleCreationPayload,
  RoleUpdatePayload,
  ResourcePermission,
} from "./models";
import type { PermissionEventHandler } from "./events";

/**
 * Permission data provider interface.
 *
 * All data sources (Supabase, REST, GraphQL, etc.) must implement these
 * methods so the service layer can operate independently of the underlying
 * storage mechanism.
 */
export interface IPermissionDataProvider {
  /**
   * Determine whether a user possesses a specific permission.
   *
   * @param userId - ID of the user being checked.
   * @param permission - Permission to verify.
   * @returns `true` if the user has the permission, otherwise `false`.
   */
  hasPermission(userId: string, permission: Permission): Promise<boolean>;

  /**
   * Determine whether a user holds a specific role.
   *
   * @param userId - ID of the user being checked.
   * @param role - Role to verify.
   * @returns `true` if the user has the role, otherwise `false`.
   */
  hasRole(userId: string, role: Role): Promise<boolean>;

  /**
   * Retrieve all roles with their associated permissions.
   *
   * @returns Array of roles and their permissions.
   */
  getAllRoles(): Promise<RoleWithPermissions[]>;

  /**
   * Get a role by its identifier.
   *
   * @param roleId - Unique identifier of the role.
   * @returns The role with its permissions, or `null` if not found.
   */
  getRoleById(roleId: string): Promise<RoleWithPermissions | null>;

  /**
   * Create a new role.
   *
   * @param roleData - Payload describing the role.
   * @returns The created role with its permissions.
   */
  createRole(roleData: RoleCreationPayload): Promise<RoleWithPermissions>;

  /**
   * Update an existing role.
   *
   * @param roleId - ID of the role to update.
   * @param roleData - Updated role information.
   * @returns The updated role with its permissions.
   */
  updateRole(
    roleId: string,
    roleData: RoleUpdatePayload,
  ): Promise<RoleWithPermissions>;

  /**
   * Delete a role.
   *
   * @param roleId - ID of the role to delete.
   * @returns `true` if the role was removed, otherwise `false`.
   */
  deleteRole(roleId: string): Promise<boolean>;

  /**
   * Retrieve all roles assigned to a user.
   *
   * @param userId - ID of the user.
   * @returns Array of user role assignments.
   */
  getUserRoles(userId: string): Promise<UserRole[]>;

  /**
   * Assign a role to a user.
   *
   * @param userId - ID of the user receiving the role.
   * @param roleId - ID of the role being assigned.
   * @param assignedBy - ID of the user performing the assignment.
   * @param expiresAt - Optional expiration date for the assignment.
   * @returns The created user role assignment.
   */
  assignRoleToUser(
    userId: string,
    roleId: string,
    assignedBy: string,
    expiresAt?: Date,
  ): Promise<UserRole>;

  /**
   * Remove a role from a user.
   *
   * @param userId - ID of the user.
   * @param roleId - ID of the role to remove.
   * @returns `true` if the role was removed, otherwise `false`.
   */
  removeRoleFromUser(userId: string, roleId: string): Promise<boolean>;

  /**
   * Check if a role possesses a permission.
   *
   * @param roleId - ID of the role.
   * @param permission - Permission to verify.
   * @returns `true` if the role has the permission, otherwise `false`.
   */
  roleHasPermission(roleId: string, permission: Permission): Promise<boolean>;

  /**
   * Add a permission to a role.
   *
   * @param roleId - ID of the role to modify.
   * @param permission - Permission to add to the role.
   * @returns Information about the permission assignment.
   */
  addPermissionToRole(
    roleId: string,
    permission: Permission,
  ): Promise<PermissionAssignment>;

  /**
   * Remove a permission from a role.
   *
   * @param roleId - ID of the role.
   * @param permission - Permission to remove.
   * @returns `true` if the permission was removed, otherwise `false`.
   */
  removePermissionFromRole(
    roleId: string,
    permission: Permission,
  ): Promise<boolean>;

  /**
   * List all available permissions.
   *
   * @returns Array of permissions recognised by the system.
   */
  getAllPermissions(): Promise<Permission[]>;

  /**
   * List permissions assigned to a role.
   *
   * @param roleId - ID of the role.
   * @returns Array of permissions linked to the role.
   */
  getRolePermissions(roleId: string): Promise<Permission[]>;

  /**
   * Assign a permission scoped to a specific resource to a user.
   */
  assignResourcePermission(
    userId: string,
    permission: Permission,
    resourceType: string,
    resourceId: string,
  ): Promise<ResourcePermission>;

  /**
   * Remove a resource scoped permission from a user.
   */
  removeResourcePermission(
    userId: string,
    permission: Permission,
    resourceType: string,
    resourceId: string,
  ): Promise<boolean>;

  /**
   * Check if a user holds a permission for a specific resource.
   */
  hasResourcePermission(
    userId: string,
    permission: Permission,
    resourceType: string,
    resourceId: string,
  ): Promise<boolean>;

  /**
   * List all resource permissions granted to a user.
   */
  getUserResourcePermissions(userId: string): Promise<ResourcePermission[]>;

  /**
   * List all permissions for a given resource.
   */
  getPermissionsForResource(
    resourceType: string,
    resourceId: string,
  ): Promise<ResourcePermission[]>;

  /**
   * Get all users that have a specific permission for a resource.
   */
  getUsersWithResourcePermission(
    resourceType: string,
    resourceId: string,
    permission: Permission,
  ): Promise<string[]>;

  /**
   * Sync default role permissions with persistent storage.
   *
   * Implementations should ensure that the stored roles match the default
   * definitions provided by the domain models.
   *
   * @returns `true` if the sync succeeded, otherwise `false`.
   */
  syncRolePermissions(): Promise<boolean>;

  /**
   * Subscribe to permission related events.
   *
   * @param handler - Function invoked when a permission event occurs.
   * @returns Function to unsubscribe from the events.
   */
  onPermissionEvent(handler: PermissionEventHandler): () => void;
}
