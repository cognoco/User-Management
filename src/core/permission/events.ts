/**
 * Permission Domain Events
 * 
 * This file defines events that can be emitted by the permission service.
 * These events allow other parts of the application to react to changes
 * in permissions and roles.
 */

import { Permission, RoleWithPermissions, UserRole } from './models';

/**
 * Enumeration of all permission event types
 */
export enum PermissionEventTypes {
  ROLE_CREATED = 'ROLE_CREATED',
  ROLE_UPDATED = 'ROLE_UPDATED',
  ROLE_DELETED = 'ROLE_DELETED',
  PERMISSION_ADDED = 'PERMISSION_ADDED',
  PERMISSION_REMOVED = 'PERMISSION_REMOVED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REMOVED = 'ROLE_REMOVED',
  ROLE_PERMISSIONS_SYNCED = 'ROLE_PERMISSIONS_SYNCED'
}

/**
 * Base event interface for all permission events
 */
export interface BasePermissionEvent {
  type: string;
  timestamp: Date;
}

/**
 * Event emitted when a role is created
 */
export interface RoleCreatedEvent extends BasePermissionEvent {
  type: PermissionEventTypes.ROLE_CREATED;
  role: RoleWithPermissions;
}

/**
 * Event emitted when a role is updated
 */
export interface RoleUpdatedEvent extends BasePermissionEvent {
  type: PermissionEventTypes.ROLE_UPDATED;
  role: RoleWithPermissions;
  previousRole: RoleWithPermissions;
}

/**
 * Event emitted when a role is deleted
 */
export interface RoleDeletedEvent extends BasePermissionEvent {
  type: PermissionEventTypes.ROLE_DELETED;
  roleId: string;
}

/**
 * Event emitted when a permission is added to a role
 */
export interface PermissionAddedEvent extends BasePermissionEvent {
  type: PermissionEventTypes.PERMISSION_ADDED;
  roleId: string;
  permission: Permission;
}

/**
 * Event emitted when a permission is removed from a role
 */
export interface PermissionRemovedEvent extends BasePermissionEvent {
  type: PermissionEventTypes.PERMISSION_REMOVED;
  roleId: string;
  permission: Permission;
}

/**
 * Event emitted when a role is assigned to a user
 */
export interface RoleAssignedEvent extends BasePermissionEvent {
  type: PermissionEventTypes.ROLE_ASSIGNED;
  userRole: UserRole;
}

/**
 * Event emitted when a role is removed from a user
 */
export interface RoleRemovedEvent extends BasePermissionEvent {
  type: PermissionEventTypes.ROLE_REMOVED;
  userId: string;
  roleId: string;
}

/**
 * Event emitted when role permissions are synced
 */
export interface RolePermissionsSyncedEvent extends BasePermissionEvent {
  type: PermissionEventTypes.ROLE_PERMISSIONS_SYNCED;
  roles: RoleWithPermissions[];
}

/**
 * Union type of all permission events
 */
export type PermissionEvent =
  | RoleCreatedEvent
  | RoleUpdatedEvent
  | RoleDeletedEvent
  | PermissionAddedEvent
  | PermissionRemovedEvent
  | RoleAssignedEvent
  | RoleRemovedEvent
  | RolePermissionsSyncedEvent;

/**
 * Permission event handler type
 */
export type PermissionEventHandler = (event: PermissionEvent) => void;

/**
 * Permission event emitter interface
 */
export interface PermissionEventEmitter {
  /**
   * Subscribe to permission events
   * 
   * @param handler Function to call when an event is emitted
   * @returns Unsubscribe function
   */
  subscribe(handler: PermissionEventHandler): () => void;
  
  /**
   * Emit a permission event
   * 
   * @param event The event to emit
   */
  emit(event: PermissionEvent): void;
}
