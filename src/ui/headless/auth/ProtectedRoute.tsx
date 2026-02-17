/**
 * Headless Protected Route Component
 * 
 * This component handles the behavior of route protection without any UI rendering.
 * It follows the headless UI pattern using render props to allow complete UI customization.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';

export interface ProtectedRouteProps {
  /**
   * Required role to access the route (optional)
   */
  requiredRole?: string;
  
  /**
   * Required permission to access the route (optional)
   */
  requiredPermission?: string;
  
  /**
   * URL to redirect to if authentication fails
   */
  redirectUrl?: string;
  
  /**
   * Custom authentication check (if not provided, isAuthenticated from auth hook is used)
   */
  isAuthenticated?: boolean;
  
  /**
   * Custom loading state (if not provided, internal state is used)
   */
  isLoading?: boolean;
  
  /**
   * Callback when authentication fails
   */
  onAuthFail?: (redirectUrl?: string) => void;
  
  /**
   * Render prop function that receives authentication state
   */
  render: (props: {
    isAuthenticated: boolean;
    isAuthorized: boolean;
    isLoading: boolean;
    user: any;
    redirectUrl?: string;
  }) => React.ReactNode;
}

export function ProtectedRoute({
  requiredRole,
  requiredPermission,
  redirectUrl = '/auth/login',
  isAuthenticated: externalIsAuthenticated,
  isLoading: externalIsLoading,
  onAuthFail,
  render
}: ProtectedRouteProps) {
  // Get authentication hook
  const { isAuthenticated: authIsAuthenticated, user, isLoading: authIsLoading } = useAuth();
  const hasRole = (role: string): boolean => (user?.role === role) || ((user?.metadata?.roles as string[] | undefined)?.includes(role) ?? false);
  const hasPermission = (permission: string): boolean => (user?.metadata?.permissions as string[] | undefined)?.includes(permission) ?? false;
  
  // State
  const [isChecking, setIsChecking] = useState(true);
  
  // Use external state if provided, otherwise use internal state
  const isAuthenticated = externalIsAuthenticated !== undefined ? externalIsAuthenticated : authIsAuthenticated;
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : authIsLoading || isChecking;
  
  // Check if user has required role/permission
  const isAuthorized = (() => {
    if (!isAuthenticated || !user) {
      return false;
    }
    
    if (requiredRole && !hasRole(requiredRole)) {
      return false;
    }
    
    if (requiredPermission && !hasPermission(requiredPermission)) {
      return false;
    }
    
    return true;
  })();
  
  // Handle authentication check
  useEffect(() => {
    const checkAuth = async () => {
      setIsChecking(true);
      
      try {
        // If not authenticated or not authorized, redirect
        if (!isLoading && (!isAuthenticated || !isAuthorized)) {
          onAuthFail?.(redirectUrl);
        }
      } finally {
        setIsChecking(false);
      }
    };
    
    checkAuth();
  }, [isAuthenticated, isAuthorized, isLoading, onAuthFail, redirectUrl]);
  
  // Render the component using the render prop
  return render({
    isAuthenticated,
    isAuthorized,
    isLoading,
    user,
    redirectUrl
  });
}

export default ProtectedRoute;
