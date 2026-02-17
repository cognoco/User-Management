import React from 'react';
import { User } from '@/types/user';
import { useRBACStore } from '@/lib/stores/rbac.store';
import { UserRoleSchema, RoleSchema } from '@/types/rbac';

/**
 * Headless RoleManagementPanel Component
 *
 * Purpose:
 *   - Provides role management functionality without UI implementation
 *   - Follows the headless UI pattern with render props
 *   - Designed to be modular, pluggable, and database-agnostic (uses RBAC store abstraction)
 *
 * Props:
 *   - users: User[]
 *     List of user objects to manage roles for
 *   - children: Render prop function that receives role management state and handlers
 *
 * Usage Example:
 *   import { RoleManagementPanel } from '@/ui/headless/admin/RoleManagementPanel';
 *   
 *   <RoleManagementPanel users={users}>
 *     {({ roles, userRoles, isLoading, error, getUserRoleAssignments, getAssignableRoles, handleAssignRole, handleRemoveRole }) => (
 *       // Your custom UI implementation here
 *     )}
 *   </RoleManagementPanel>
 *
 * Backend Abstraction:
 *   - All role/permission logic is abstracted via the RBAC store (see '@/lib/stores/rbac.store')
 *   - Swapping database providers only requires updating the store implementation
 */

export interface RoleManagementPanelProps {
  users: User[];
  children: (props: {
    roles: RoleSchema[];
    userRoles: UserRoleSchema[];
    isLoading: boolean;
    error: string | null;
    getUserRoleAssignments: (userId: string | number) => UserRoleSchema[];
    getAssignableRoles: (userId: string | number) => RoleSchema[];
    handleAssignRole: (userId: string | number, roleId: string) => Promise<void>;
    handleRemoveRole: (userId: string | number, roleId: string) => Promise<void>;
  }) => React.ReactNode;
}

export function RoleManagementPanel({ users, children }: RoleManagementPanelProps) {
  // useRBACStore is a custom hook returning the full RBAC state — not a Zustand store
  const { roles, userRoles, isLoading, error, assignRole, removeRole } = useRBACStore();

  // Helper to get role assignments for a user
  const getUserRoleAssignments = (userId: string | number): UserRoleSchema[] =>
    userRoles.filter((ur: UserRoleSchema) => ur.userId === String(userId));

  // Helper to get roles not assigned to a user
  const getAssignableRoles = (userId: string | number): RoleSchema[] => {
    const assignedRoleIds = new Set(getUserRoleAssignments(userId).map((ur: UserRoleSchema) => ur.roleId));
    return roles.filter((role: RoleSchema) => !assignedRoleIds.has(role.id));
  };

  const handleAssignRole = async (userId: string | number, roleId: string) => {
    if (!isLoading) {
      await assignRole(userId.toString(), roleId);
    }
  };

  const handleRemoveRole = async (userId: string | number, roleId: string) => {
    if (!isLoading) {
      await removeRole(userId.toString(), roleId);
    }
  };

  return children({
    roles,
    userRoles,
    isLoading,
    error,
    getUserRoleAssignments,
    getAssignableRoles,
    handleAssignRole,
    handleRemoveRole
  });
}

export default RoleManagementPanel;
