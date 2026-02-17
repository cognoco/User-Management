/**
 * Permission Domain Models
 * 
 * This file defines the core entities and types for the permission and role domain.
 */

import { z } from 'zod';

/**
 * System permissions as string literals
 */
export const PermissionValues = {
  // User Management
  ADMIN_ACCESS: 'ADMIN_ACCESS',
  VIEW_ALL_USER_ACTION_LOGS: 'VIEW_ALL_USER_ACTION_LOGS',
  EDIT_USER_PROFILES: 'EDIT_USER_PROFILES',
  DELETE_USER_ACCOUNTS: 'DELETE_USER_ACCOUNTS',
  
  // Role Management
  MANAGE_ROLES: 'MANAGE_ROLES',
  
  // Analytics & Data
  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
  EXPORT_DATA: 'EXPORT_DATA',
  
  // System Settings
  MANAGE_SETTINGS: 'MANAGE_SETTINGS',
  MANAGE_API_KEYS: 'MANAGE_API_KEYS',
  
  // Team Management
  INVITE_USERS: 'INVITE_USERS',
  MANAGE_TEAMS: 'MANAGE_TEAMS',
  
  // Billing & Subscription
  MANAGE_BILLING: 'MANAGE_BILLING',
  MANAGE_SUBSCRIPTIONS: 'MANAGE_SUBSCRIPTIONS',
  
  // Admin Dashboard
  ACCESS_ADMIN_DASHBOARD: 'ACCESS_ADMIN_DASHBOARD',
  VIEW_ADMIN_DASHBOARD: 'VIEW_ADMIN_DASHBOARD',
  
  // Team Management
  INVITE_TEAM_MEMBER: 'INVITE_TEAM_MEMBER',
  REMOVE_TEAM_MEMBER: 'REMOVE_TEAM_MEMBER',
  UPDATE_MEMBER_ROLE: 'UPDATE_MEMBER_ROLE',
  VIEW_TEAM_MEMBERS: 'VIEW_TEAM_MEMBERS',
  
  // Project Management
  CREATE_PROJECT: 'CREATE_PROJECT',
  DELETE_PROJECT: 'DELETE_PROJECT',
  EDIT_PROJECT: 'EDIT_PROJECT',
  VIEW_PROJECTS: 'VIEW_PROJECTS',
} as const;

/**
 * Type representing all possible permissions
 */
export type Permission = typeof PermissionValues[keyof typeof PermissionValues];

/**
 * Zod schema for validating permissions
 */
export const PermissionSchema = z.enum(Object.values(PermissionValues) as [string, ...string[]]);

/**
 * User roles in the system
 */
export const RoleValues = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  USER: 'USER',
  VIEWER: 'VIEWER',
  BILLING_MANAGER: 'BILLING_MANAGER',
  MEMBER: 'MEMBER',
} as const;

/**
 * Type representing all possible roles
 */
export type Role = typeof RoleValues[keyof typeof RoleValues];

/**
 * Zod schema for validating roles
 */
export const RoleSchema = z.enum(Object.values(RoleValues) as [string, ...string[]]);

/**
 * Base role entity
 */
export interface RoleEntity {
  id: string;
  name: string;
  description: string;
  isSystemRole?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role with permissions
 */
export interface RoleWithPermissions extends RoleEntity {
  permissions: Permission[];
}

/**
 * User role assignment
 */
export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  role?: RoleEntity;
  assignedBy: string;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Permission assignment to a role
 */
export interface PermissionAssignment {
  id: string;
  roleId: string;
  permission: Permission;
  createdAt: Date;
}

/**
 * Payload for creating a new role
 */
export interface RoleCreationPayload {
  name: string;
  description?: string;
  isSystemRole?: boolean;
  permissions?: Permission[];
}

/**
 * Payload for updating an existing role
 */
export interface RoleUpdatePayload {
  name?: string;
  description?: string;
  isSystemRole?: boolean;
  permissions?: Permission[];
}

/**
 * Role-Permission mapping type
 */
export type RolePermissionMap = {
  [key in Role]: Permission[];
};

/**
 * Default role definitions with permissions
 */
export const DefaultRoleDefinitions: RolePermissionMap = {
  SUPER_ADMIN: Object.values(PermissionValues),
  
  ADMIN: [
    PermissionValues.ADMIN_ACCESS,
    PermissionValues.VIEW_ALL_USER_ACTION_LOGS,
    PermissionValues.EDIT_USER_PROFILES,
    PermissionValues.DELETE_USER_ACCOUNTS,
    PermissionValues.MANAGE_ROLES,
    PermissionValues.VIEW_ANALYTICS,
    PermissionValues.EXPORT_DATA,
    PermissionValues.MANAGE_SETTINGS,
    PermissionValues.MANAGE_API_KEYS,
    PermissionValues.INVITE_USERS,
    PermissionValues.MANAGE_TEAMS,
    PermissionValues.ACCESS_ADMIN_DASHBOARD,
    PermissionValues.VIEW_ADMIN_DASHBOARD,
    PermissionValues.INVITE_TEAM_MEMBER,
    PermissionValues.REMOVE_TEAM_MEMBER,
    PermissionValues.UPDATE_MEMBER_ROLE,
    PermissionValues.VIEW_TEAM_MEMBERS,
    PermissionValues.CREATE_PROJECT,
    PermissionValues.DELETE_PROJECT,
    PermissionValues.EDIT_PROJECT,
    PermissionValues.VIEW_PROJECTS,
  ],
  
  MANAGER: [
    PermissionValues.VIEW_ALL_USER_ACTION_LOGS,
    PermissionValues.EDIT_USER_PROFILES,
    PermissionValues.VIEW_ANALYTICS,
    PermissionValues.EXPORT_DATA,
    PermissionValues.INVITE_USERS,
    PermissionValues.MANAGE_TEAMS,
    PermissionValues.VIEW_ADMIN_DASHBOARD,
    PermissionValues.INVITE_TEAM_MEMBER,
    PermissionValues.REMOVE_TEAM_MEMBER,
    PermissionValues.UPDATE_MEMBER_ROLE,
    PermissionValues.VIEW_TEAM_MEMBERS,
    PermissionValues.CREATE_PROJECT,
    PermissionValues.DELETE_PROJECT,
    PermissionValues.EDIT_PROJECT,
    PermissionValues.VIEW_PROJECTS,
  ],
  
  USER: [
    PermissionValues.VIEW_ANALYTICS,
    PermissionValues.EXPORT_DATA,
    PermissionValues.VIEW_TEAM_MEMBERS,
    PermissionValues.EDIT_PROJECT,
    PermissionValues.VIEW_PROJECTS,
  ],
  
  VIEWER: [
    PermissionValues.VIEW_TEAM_MEMBERS,
    PermissionValues.VIEW_PROJECTS,
  ],
  
  BILLING_MANAGER: [
    PermissionValues.VIEW_TEAM_MEMBERS,
    PermissionValues.MANAGE_BILLING,
    PermissionValues.MANAGE_SUBSCRIPTIONS,
    PermissionValues.VIEW_PROJECTS,
  ],
  
  MEMBER: [
    PermissionValues.VIEW_TEAM_MEMBERS,
    PermissionValues.VIEW_PROJECTS,
    PermissionValues.EDIT_PROJECT,
    PermissionValues.CREATE_PROJECT,
  ],
};

/**
 * Permission assignment tied to a specific resource
 */
export interface ResourcePermission {
  /** Unique identifier */
  id: string;
  /** User that holds the permission */
  userId: string;
  /** Permission granted */
  permission: Permission;
  /** Resource type, e.g. "project" */
  resourceType: string;
  /** Resource identifier */
  resourceId: string;
  /** Date the permission was created */
  createdAt: Date;
}
