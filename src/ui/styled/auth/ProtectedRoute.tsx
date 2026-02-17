import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/auth/useAuth';
import { useRBACStore } from '@/lib/stores/rbac.store';
import type { Role, Permission } from '@/types/rbac';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  redirectPath?: string;
  accessDeniedComponent?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  redirectPath = '/auth/login',
  accessDeniedComponent,
}): React.ReactElement | null => {
  const router = useRouter();
  
  // Update to use individual selectors for React 19 compatibility
  const isAuthenticated = useAuth().isAuthenticated;
  const authLoading = useAuth().isLoading;
  const user = useAuth().user;
  
  // useRBACStore is a custom hook returning the full RBAC state — not a Zustand store
  const { hasRole, hasPermission, fetchUserRoles, isLoading: rbacLoading } = useRBACStore();

  useEffect(() => {
    if (user) {
      fetchUserRoles(user.id);
    }
  }, [user, fetchUserRoles]);

  // Show loading state while checking authentication and permissions
  if (authLoading || rbacLoading) {
    return <div className="animate-pulse" data-testid="loading-spinner">Loading...</div>;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    router.push(redirectPath);
    return null;
  }

  // Check roles if required
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => hasRole(role as Role));
    if (!hasRequiredRole) {
      return (accessDeniedComponent as React.ReactElement | null) ?? (
        <div className="text-center p-4">
          Access denied: Insufficient role permissions
        </div>
      );
    }
  }

  // Check permissions if required
  if (requiredPermissions.length > 0) {
    const hasRequiredPermissions = requiredPermissions.every(permission =>
      hasPermission(permission as Permission)
    );
    if (!hasRequiredPermissions) {
      return (accessDeniedComponent as React.ReactElement | null) ?? (
        <div className="text-center p-4">
          Access denied: Insufficient permissions
        </div>
      );
    }
  }

  return <>{children}</>;
}

export default ProtectedRoute; 