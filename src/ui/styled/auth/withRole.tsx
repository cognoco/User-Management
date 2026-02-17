import React, { useEffect } from 'react';
import { useRBACStore } from '@/lib/stores/rbac.store';
import { WithRoleProps } from '@/types/rbac';
import { useAuth } from '@/hooks/auth/useAuth';

export function withRole<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  { requiredRole, requiredPermissions, fallback }: WithRoleProps = {}
) {
  return function WithRoleComponent(props: P) {
    // useRBACStore is a custom hook returning the full RBAC state — not a Zustand store
    const { hasRole, hasPermission, fetchUserRoles } = useRBACStore();
    
    // Use a single primitive selector for the user
    const user = useAuth().user;

    useEffect(() => {
      if (user) {
        fetchUserRoles(user.id);
      }
    }, [user, fetchUserRoles]);

    // Check role requirements
    if (requiredRole && !hasRole(requiredRole)) {
      return fallback || null;
    }

    // Check permission requirements
    if (requiredPermissions?.length) {
      const hasAllPermissions = requiredPermissions.every((permission) =>
        hasPermission(permission)
      );
      if (!hasAllPermissions) {
        return fallback || null;
      }
    }

    return <WrappedComponent {...props} />;
  };
} 