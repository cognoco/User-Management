import { ReactNode, ComponentType, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { api } from '@/lib/api/axios';

/**
 * Headless withRole higher-order component that handles role-based access control
 * This follows the headless UI pattern from the architecture guidelines
 */
export interface WithRoleProps {
  /**
   * Required roles for access (any of these roles grants access)
   */
  requiredRoles?: string[];

  /**
   * Required permissions for access (all of these permissions are needed)
   */
  requiredPermissions?: string[];

  /**
   * Component to render when access is denied
   */
  fallback?: ReactNode;

  /**
   * Called when access is denied
   */
  onAccessDenied?: () => void;

  /**
   * Whether to check roles/permissions (useful for conditional checks)
   */
  bypass?: boolean;

  /**
   * Render prop function that receives state and handlers
   */
  children: (props: WithRoleRenderProps) => ReactNode;
}

export interface WithRoleRenderProps {
  /**
   * Whether the user has the required roles/permissions
   */
  hasAccess: boolean;

  /**
   * The user's roles
   */
  userRoles: string[];

  /**
   * The user's permissions
   */
  userPermissions: string[];

  /**
   * Whether the component is in a loading state
   */
  isLoading: boolean;

  /**
   * Error message, if any
   */
  error?: string;

  /**
   * Check if the user has a specific role
   */
  hasRole: (role: string) => boolean;

  /**
   * Check if the user has a specific permission
   */
  hasPermission: (permission: string) => boolean;
}

/**
 * Higher-order component that wraps a component with role-based access control
 * @param WrappedComponent The component to wrap
 * @param options Role and permission options
 */
export function withRole<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: {
    requiredRoles?: string[];
    requiredPermissions?: string[];
    fallback?: ReactNode;
    onAccessDenied?: () => void;
  }
) {
  return function WithRoleWrapper(props: P) {
    return (
      <WithRoleComponent
        requiredRoles={options.requiredRoles}
        requiredPermissions={options.requiredPermissions}
        fallback={options.fallback}
        onAccessDenied={options.onAccessDenied}
      >
        {(roleProps) => (
          roleProps.hasAccess ? <WrappedComponent {...props} /> : (options.fallback || null)
        )}
      </WithRoleComponent>
    );
  };
}

/**
 * Component implementation of the withRole functionality
 */
export const WithRoleComponent = ({
  requiredRoles = [],
  requiredPermissions = [],
  onAccessDenied,
  bypass = false,
  children
}: WithRoleProps) => {
  // Get authentication hook — only use what exists in UseAuth
  const { user, isLoading: authIsLoading, error: authError } = useAuth();
  
  // State
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [hasAccess, setHasAccess] = useState(bypass);

  // Load user roles and permissions
  useEffect(() => {
    if (bypass) {
      setIsLoading(false);
      setHasAccess(true);
      return;
    }

    const loadRolesAndPermissions = async () => {
      try {
        // Fetch user roles directly via API
        const userId = user?.id;
        const rolesRes = userId ? await api.get(`/users/${userId}/roles`) : { data: [] };
        const roles: string[] = Array.isArray(rolesRes.data) ? rolesRes.data.map((r: any) => r.name || r.role || r) : [];
        const permissions: string[] = [];
        
        setUserRoles(roles);
        setUserPermissions(permissions);
        
        // Check if user has required roles or permissions
        const hasRequiredRoles = requiredRoles.length === 0 || 
          requiredRoles.some(role => roles.includes(role));
        
        const hasRequiredPermissions = requiredPermissions.length === 0;
        
        const userHasAccess = hasRequiredRoles && hasRequiredPermissions;
        setHasAccess(userHasAccess);
        
        if (!userHasAccess) {
          onAccessDenied?.();
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to check user roles/permissions';
        setError(errorMessage);
        setHasAccess(false);
        onAccessDenied?.();
      } finally {
        setIsLoading(false);
      }
    };

    loadRolesAndPermissions();
  }, [bypass, requiredRoles.join(','), requiredPermissions.join(',')]);

  // Check if user has a specific role
  const hasRoleCheck = (role: string) => {
    return userRoles.includes(role);
  };

  // Check if user has a specific permission
  const hasPermissionCheck = (permission: string) => {
    return userPermissions.includes(permission);
  };
  
  // Prepare render props
  const renderProps: WithRoleRenderProps = {
    hasAccess,
    userRoles,
    userPermissions,
    isLoading: isLoading || authIsLoading,
    error: error || (authError ?? undefined),
    hasRole: hasRoleCheck,
    hasPermission: hasPermissionCheck
  };
  
  return children(renderProps);
};

export default withRole;
