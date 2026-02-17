import { z } from 'zod';

/**
 * Defines all available permissions in the system
 */
export const Permission = {
  // Team Management
  INVITE_TEAM_MEMBER: 'INVITE_TEAM_MEMBER',
  REMOVE_TEAM_MEMBER: 'REMOVE_TEAM_MEMBER',
  UPDATE_MEMBER_ROLE: 'UPDATE_MEMBER_ROLE',
  VIEW_TEAM_MEMBERS: 'VIEW_TEAM_MEMBERS',
  
  // Billing & Subscription
  MANAGE_BILLING: 'MANAGE_BILLING',
  VIEW_INVOICES: 'VIEW_INVOICES',
  UPDATE_SUBSCRIPTION: 'UPDATE_SUBSCRIPTION',
  
  // Organization Settings
  MANAGE_ORG_SETTINGS: 'MANAGE_ORG_SETTINGS',
  CONFIGURE_SSO: 'CONFIGURE_SSO',
  MANAGE_DOMAINS: 'MANAGE_DOMAINS',
  
  // Project Management
  CREATE_PROJECT: 'CREATE_PROJECT',
  DELETE_PROJECT: 'DELETE_PROJECT',
  EDIT_PROJECT: 'EDIT_PROJECT',
  VIEW_PROJECTS: 'VIEW_PROJECTS',
  
  // Admin Functions
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
  MANAGE_API_KEYS: 'MANAGE_API_KEYS',
  ACCESS_ADMIN_DASHBOARD: 'ACCESS_ADMIN_DASHBOARD',
} as const;

export type Permission = typeof Permission[keyof typeof Permission];

/**
 * Defines the standard roles and their associated permissions
 */
export const RoleDefinition = {
  ADMIN: {
    name: 'Admin',
    description: 'Full access to all features and settings',
    permissions: Object.values(Permission),
  },
  
  BILLING_MANAGER: {
    name: 'Billing Manager',
    description: 'Can manage billing, subscriptions, and view team information',
    permissions: [
      Permission.VIEW_TEAM_MEMBERS,
      Permission.MANAGE_BILLING,
      Permission.VIEW_INVOICES,
      Permission.UPDATE_SUBSCRIPTION,
      Permission.VIEW_PROJECTS,
    ],
  },
  
  MEMBER: {
    name: 'Member',
    description: 'Standard team member with project access',
    permissions: [
      Permission.VIEW_TEAM_MEMBERS,
      Permission.VIEW_INVOICES,
      Permission.VIEW_PROJECTS,
      Permission.EDIT_PROJECT,
      Permission.CREATE_PROJECT,
    ],
  },
  
  VIEWER: {
    name: 'Viewer',
    description: 'Read-only access to projects and team information',
    permissions: [
      Permission.VIEW_TEAM_MEMBERS,
      Permission.VIEW_PROJECTS,
    ],
  },
} as const;

export type RoleType = keyof typeof RoleDefinition;

/**
 * Zod schema for validating role types
 */
export const roleSchema = z.enum(['ADMIN', 'BILLING_MANAGER', 'MEMBER', 'VIEWER']);

/**
 * Type guard to check if a string is a valid Permission
 */
export function isPermission(value: string): value is Permission {
  return Object.values(Permission).includes(value as Permission);
}

/**
 * Type guard to check if a string is a valid RoleType
 */
export function isRole(value: string): value is RoleType {
  return Object.keys(RoleDefinition).includes(value as RoleType);
}

/**
 * Get permissions for a specific role
 */
export function getPermissionsForRole(role: RoleType): Permission[] {
  return RoleDefinition[role].permissions as unknown as Permission[];
}

/**
 * Check if a role has a specific permission
 */
export function hasRolePermission(role: RoleType, permission: Permission): boolean {
  return (RoleDefinition[role].permissions as readonly string[]).includes(permission);
}

/**
 * Get all available roles with their descriptions
 */
export function getAllRoles() {
  return Object.entries(RoleDefinition).map(([key, value]) => ({
    id: key,
    name: value.name,
    description: value.description,
    permissions: value.permissions,
  }));
}