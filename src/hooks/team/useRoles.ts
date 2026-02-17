/**
 * Roles Hook
 * 
 * This hook provides role management functionality.
 * It follows the architecture principles by connecting the UI layer to the service layer.
 */

import { useState, useEffect, useCallback } from 'react';
import { PermissionService } from '@/core/permission/interfaces';
import { 
  Role, 
  RoleWithPermissions, 
  UserRole,
  RoleCreationPayload, 
  RoleUpdatePayload 
} from '@/core/permission/models';
import { UserManagementConfiguration } from '@/core/config';

/**
 * Hook for role management functionality
 * 
 * @returns Role management state and methods
 */
export function useRoles() {
  // Get the permission service from the service provider registry
  const permissionService = UserManagementConfiguration.getServiceProvider<PermissionService>('permissionService');
  
  if (!permissionService) {
    throw new Error('PermissionService is not registered in the service provider registry');
  }
  
  // Local state for roles
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [currentRole, setCurrentRole] = useState<RoleWithPermissions | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Fetch all roles
  const fetchAllRoles = useCallback(async (): Promise<RoleWithPermissions[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const allRoles = await permissionService.getAllRoles();
      
      setIsLoading(false);
      setRoles(allRoles);
      
      return allRoles;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch roles';
      
      setIsLoading(false);
      setError(errorMessage);
      
      return [];
    }
  }, [permissionService]);
  
  // Fetch a specific role
  const fetchRole = useCallback(async (roleId: string): Promise<RoleWithPermissions | null> => {
    if (!roleId) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const role = await permissionService.getRoleById(roleId);
      
      setIsLoading(false);
      
      if (role) {
        setCurrentRole(role);
      }
      
      return role;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch role';
      
      setIsLoading(false);
      setError(errorMessage);
      
      return null;
    }
  }, [permissionService]);
  
  // Create a new role
  const createRole = useCallback(async (roleData: RoleCreationPayload): Promise<RoleWithPermissions | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const role = await permissionService.createRole(roleData);
      
      setIsLoading(false);
      
      // Add the new role to the roles list
      setRoles(prevRoles => [...prevRoles, role]);
      setCurrentRole(role);
      setSuccessMessage('Role created successfully');
      return role;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create role';
      
      setIsLoading(false);
      setError(errorMessage);
      
      return null;
    }
  }, [permissionService]);
  
  // Update a role
  const updateRole = useCallback(async (roleId: string, roleData: RoleUpdatePayload): Promise<RoleWithPermissions | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const role = await permissionService.updateRole(roleId, roleData);
      
      setIsLoading(false);
      
      // Update the role in the roles list
      setRoles(prevRoles => 
        prevRoles.map(r => r.id === roleId ? role : r)
      );
      
      // Update current role if it's the one being updated
      if (currentRole && currentRole.id === roleId) {
        setCurrentRole(role);
      }
      
      setSuccessMessage('Role updated successfully');
      return role;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update role';
      
      setIsLoading(false);
      setError(errorMessage);
      
      return null;
    }
  }, [permissionService, currentRole]);
  
  // Delete a role
  const deleteRole = useCallback(async (roleId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await permissionService.deleteRole(roleId);
      
      setIsLoading(false);
      
      if (success) {
        // Remove the role from the roles list
        setRoles(prevRoles => prevRoles.filter(role => role.id !== roleId));
        
        // Clear current role if it's the one being deleted
        if (currentRole && currentRole.id === roleId) {
          setCurrentRole(null);
        }
        
        setSuccessMessage('Role deleted successfully');
      } else {
        setError('Failed to delete role');
      }
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete role';
      
      setIsLoading(false);
      setError(errorMessage);
      
      return false;
    }
  }, [permissionService, currentRole]);
  
  // Check if a user has a specific role
  const checkUserHasRole = useCallback(async (userId: string, role: Role): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const hasRole = await permissionService.hasRole(userId, role);
      
      setIsLoading(false);
      
      return hasRole;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check user role';
      
      setIsLoading(false);
      setError(errorMessage);
      
      return false;
    }
  }, [permissionService]);
  
  // Assign a role to a user
  const assignRoleToUser = useCallback(async (
    userId: string, 
    roleId: string, 
    assignedBy: string, 
    expiresAt?: Date
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await permissionService.assignRoleToUser(userId, roleId, assignedBy, expiresAt);
      
      setIsLoading(false);
      
      setSuccessMessage('Role assigned successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign role to user';
      
      setIsLoading(false);
      setError(errorMessage);
      
      return false;
    }
  }, [permissionService]);
  
  // Remove a role from a user
  const removeRoleFromUser = useCallback(async (userId: string, roleId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await permissionService.removeRoleFromUser(userId, roleId);
      
      setIsLoading(false);
      
      if (success) {
        setSuccessMessage('Role removed successfully');
      } else {
        setError('Failed to remove role from user');
      }
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove role from user';
      
      setIsLoading(false);
      setError(errorMessage);
      
      return false;
    }
  }, [permissionService]);
  
  // Get user roles
  const getUserRoles = useCallback(async (userId: string): Promise<UserRole[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const userRoles = await permissionService.getUserRoles(userId);
      
      setIsLoading(false);
      
      return userRoles;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get user roles';
      
      setIsLoading(false);
      setError(errorMessage);
      
      return [];
    }
  }, [permissionService]);
  
  // Clear any error or success messages
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);
  
  // Fetch all roles when the component mounts
  useEffect(() => {
    fetchAllRoles();
  }, [fetchAllRoles]);
  
  return {
    // State
    roles,
    currentRole,
    isLoading,
    error,
    successMessage,
    
    // Methods
    fetchAllRoles,
    fetchRole,
    createRole,
    updateRole,
    deleteRole,
    checkUserHasRole,
    assignRoleToUser,
    removeRoleFromUser,
    getUserRoles,
    clearMessages,
    
    // Helper methods
    setCurrentRole
  };
}

export default useRoles;
