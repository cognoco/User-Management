/**
 * Headless Permission Editor Component
 * 
 * This component handles the behavior of permission management without any UI rendering.
 * It follows the headless UI pattern using render props to allow complete UI customization.
 */

import { useState, useEffect, useCallback } from 'react';
import { usePermissions } from '@/hooks/permission/usePermissions';
import { Permission } from '@/core/permission/models';

export interface PermissionEditorProps {
  /**
   * Called when permissions are synced
   */
  onSyncPermissions?: () => Promise<void>;
  
  /**
   * Custom loading state (if not provided, internal state is used)
   */
  isLoading?: boolean;
  
  /**
   * Custom error message (if not provided, internal state is used)
   */
  error?: string;
  
  /**
   * Custom success message (if not provided, internal state is used)
   */
  successMessage?: string;
  
  /**
   * Render prop function that receives state and handlers
   */
  render: (props: {
    // Permission list state and handlers
    permissions: Permission[];
    refreshPermissions: () => Promise<void>;
    syncPermissions: () => Promise<void>;
    
    // Permission filter state and handlers
    filterValue: string;
    setFilterValue: (value: string) => void;
    filteredPermissions: Permission[];
    
    // Permission group state
    permissionGroups: { name: string; permissions: Permission[] }[];
    
    // General state
    isLoading: boolean;
    error?: string;
    successMessage?: string;
  }) => React.ReactNode;
}

export function PermissionEditor({
  onSyncPermissions,
  isLoading: externalIsLoading,
  error: externalError,
  successMessage: externalSuccessMessage,
  render
}: PermissionEditorProps) {
  // Get permissions hook
  const { 
    permissions, 
    fetchAllPermissions,
    syncRolePermissions,
    isLoading: permissionsIsLoading, 
    error: permissionsError,
    successMessage: permissionsSuccessMessage
  } = usePermissions();
  
  // Local state
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterValue, setFilterValue] = useState('');
  
  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : permissionsIsLoading || isProcessing;
  const error = externalError !== undefined ? externalError : permissionsError;
  const successMessage = externalSuccessMessage !== undefined ? externalSuccessMessage : permissionsSuccessMessage;
  
  // Derive a human-readable group name from a permission key string
  const getPermissionGroup = (permission: Permission): string => {
    const key = permission as string;
    if (key.includes('ADMIN') || key.includes('ACCESS_ADMIN')) return 'Administration';
    if (key.includes('USER') || key.includes('EDIT_USER') || key.includes('DELETE_USER')) return 'Users';
    if (key.includes('ROLE') || key.includes('MANAGE_ROLES')) return 'Roles';
    if (key.includes('TEAM') || key.includes('INVITE')) return 'Teams';
    if (key.includes('ANALYTIC') || key.includes('EXPORT')) return 'Analytics';
    if (key.includes('BILLING') || key.includes('SUBSCRIPTION') || key.includes('INVOICE')) return 'Billing';
    if (key.includes('PROJECT')) return 'Projects';
    if (key.includes('SETTING') || key.includes('API_KEY')) return 'Settings';
    return 'General';
  };

  // Filter permissions based on search term
  const filteredPermissions = permissions.filter(permission => {
    const searchTerm = filterValue.toLowerCase();
    return (permission as string).toLowerCase().includes(searchTerm);
  });
  
  // Group permissions by derived resource group
  const permissionGroups = useMemo(() => {
    const groups: { [key: string]: Permission[] } = {};
    
    filteredPermissions.forEach(permission => {
      const groupName = getPermissionGroup(permission);
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(permission);
    });
    
    return Object.entries(groups).map(([name, perms]) => ({
      name,
      permissions: [...perms].sort((a, b) => (a as string).localeCompare(b as string))
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredPermissions]);
  
  // Refresh permissions
  const refreshPermissions = useCallback(async () => {
    try {
      await fetchAllPermissions();
    } catch (error) {
      console.error('Failed to refresh permissions:', error);
    }
  }, [fetchAllPermissions]);
  
  // Sync permissions
  const syncPermissions = useCallback(async () => {
    setIsProcessing(true);
    
    try {
      if (onSyncPermissions) {
        // Use custom sync handler
        await onSyncPermissions();
      } else {
        // Use default hook
        await syncRolePermissions();
      }
      
      // Refresh permissions after sync
      await fetchAllPermissions();
    } catch (error) {
      console.error('Failed to sync permissions:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [onSyncPermissions, syncRolePermissions, fetchAllPermissions]);
  
  // Fetch permissions on mount
  useEffect(() => {
    fetchAllPermissions();
  }, [fetchAllPermissions]);
  
  // Render the component using the render prop
  return render({
    // Permission list state and handlers
    permissions,
    refreshPermissions,
    syncPermissions,
    
    // Permission filter state and handlers
    filterValue,
    setFilterValue,
    filteredPermissions,
    
    // Permission group state
    permissionGroups,
    
    // General state
    isLoading,
    error: error ?? undefined,
    successMessage: successMessage ?? undefined
  });
}

// Helper function to memoize computed values
function useMemo<T>(factory: () => T, deps: React.DependencyList): T {
  const [value, setValue] = useState<T>(factory);
  
  useEffect(() => {
    setValue(factory());
  }, deps);
  
  return value;
}
