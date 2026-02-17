/**
 * Headless Role Manager Component
 * 
 * This component handles the behavior of role management without any UI rendering.
 * It follows the headless UI pattern using render props to allow complete UI customization.
 */

import { useState, FormEvent, useEffect, useCallback } from 'react';
import { useRoles } from '@/hooks/team/useRoles';
import { usePermissions } from '@/hooks/permission/usePermissions';
import {
  RoleWithPermissions,
  RoleCreationPayload,
  RoleUpdatePayload
} from '@/core/permission/models';
import { Permission } from '@/core/permission/models';
import { z } from 'zod';

export interface RoleManagerProps {
  /**
   * Called when a role is created
   */
  onCreateRole?: (roleData: RoleCreationPayload) => Promise<void>;
  
  /**
   * Called when a role is updated
   */
  onUpdateRole?: (roleId: string, roleData: RoleUpdatePayload) => Promise<void>;
  
  /**
   * Called when a role is deleted
   */
  onDeleteRole?: (roleId: string) => Promise<void>;
  
  /**
   * Called when permissions are assigned to a role
   */
  onAssignPermissions?: (roleId: string, permissions: Permission[]) => Promise<void>;
  
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
    // Role form state and handlers
    handleCreateRole: (e: FormEvent) => void;
    handleUpdateRole: (e: FormEvent) => void;
    handleDeleteRole: (roleId: string) => Promise<void>;
    nameValue: string;
    setNameValue: (value: string) => void;
    descriptionValue: string;
    setDescriptionValue: (value: string) => void;
    isSystemRoleValue: boolean;
    setIsSystemRoleValue: (value: boolean) => void;
    isSubmitting: boolean;
    isValid: boolean;
    formErrors: {
      name?: string;
      description?: string;
      form?: string;
    };
    touched: {
      name: boolean;
      description: boolean;
    };
    handleBlur: (field: 'name' | 'description') => void;
    resetForm: () => void;
    
    // Role list state and handlers
    roles: RoleWithPermissions[];
    currentRole: RoleWithPermissions | null;
    setCurrentRole: (role: RoleWithPermissions | null) => void;
    refreshRoles: () => Promise<void>;
    
    // Permission management
    permissions: Permission[];
    assignPermissionToRole: (roleId: string, permission: Permission) => Promise<void>;
    removePermissionFromRole: (roleId: string, permission: Permission) => Promise<void>;
    
    // General state
    isLoading: boolean;
    error?: string;
    successMessage?: string;
    isEditMode: boolean;
    setIsEditMode: (value: boolean) => void;
  }) => React.ReactNode;
}

// Role validation schema
const roleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(100, 'Role name cannot exceed 100 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  isSystemRole: z.boolean().optional(),
});

export function RoleManager({
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  onAssignPermissions,
  isLoading: externalIsLoading,
  error: externalError,
  successMessage: externalSuccessMessage,
  render
}: RoleManagerProps) {
  // Get roles hook
  const { 
    roles, 
    currentRole,
    setCurrentRole: setCurrentRoleHook,
    fetchAllRoles,
    createRole,
    updateRole,
    deleteRole,
    isLoading: rolesIsLoading, 
    error: rolesError,
    successMessage: rolesSuccessMessage
  } = useRoles();
  
  // Get permissions hook
  const {
    permissions,
    addPermissionToRole,
    removePermissionFromRole,
    isLoading: permissionsIsLoading,
    error: permissionsError,
    successMessage: permissionsSuccessMessage
  } = usePermissions();
  
  // Form state
  const [nameValue, setNameValue] = useState('');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [isSystemRoleValue, setIsSystemRoleValue] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    description?: string;
    form?: string;
  }>({});
  const [touched, setTouched] = useState({
    name: false,
    description: false
  });
  
  // UI state
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const isLoading = externalIsLoading !== undefined ? 
    externalIsLoading : 
    rolesIsLoading || permissionsIsLoading || isSubmitting;
  
  const error: string | undefined = externalError !== undefined ? 
    externalError : 
    (rolesError ?? permissionsError ?? undefined);
  
  const successMessage: string | undefined = externalSuccessMessage !== undefined ? 
    externalSuccessMessage : 
    (rolesSuccessMessage ?? permissionsSuccessMessage ?? undefined);
  
  // Reset form
  const resetForm = () => {
    setNameValue('');
    setDescriptionValue('');
    setIsSystemRoleValue(false);
    setFormErrors({});
    setTouched({
      name: false,
      description: false
    });
    setIsEditMode(false);
  };
  
  // Set current role and populate form for editing
  const setCurrentRole = useCallback((role: RoleWithPermissions | null) => {
    setCurrentRoleHook(role);
    
    if (role) {
      setNameValue(role.name);
      setDescriptionValue(role.description || '');
      setIsSystemRoleValue(role.isSystemRole || false);
      setIsEditMode(true);
    } else {
      resetForm();
    }
  }, [setCurrentRoleHook]);
  
  // Validate form
  const validateForm = () => {
    try {
      roleSchema.parse({
        name: nameValue,
        description: descriptionValue,
        isSystemRole: isSystemRoleValue
      });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setFormErrors(newErrors);
      }
      return false;
    }
  };
  
  // Check if form is valid
  const isValid = !formErrors.name && !formErrors.description && nameValue.trim() !== '';
  
  // Handle field blur
  const handleBlur = (field: 'name' | 'description') => {
    setTouched({ ...touched, [field]: true });
    
    // Validate the specific field
    try {
      if (field === 'name') {
        z.string().min(1, 'Role name is required').max(100, 'Role name cannot exceed 100 characters').parse(nameValue);
        setFormErrors({ ...formErrors, name: undefined });
      } else if (field === 'description') {
        z.string().max(500, 'Description cannot exceed 500 characters').parse(descriptionValue);
        setFormErrors({ ...formErrors, description: undefined });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = { ...formErrors };
        error.errors.forEach((err) => {
          if (field === 'name' || field === 'description') {
            newErrors[field] = err.message;
          }
        });
        setFormErrors(newErrors);
      }
    }
  };
  
  // Handle create role
  const handleCreateRole = async (e: FormEvent) => {
    e.preventDefault();
    
    // Reset form error
    setFormErrors({ ...formErrors, form: undefined });
    
    // Mark fields as touched
    setTouched({
      name: true,
      description: true
    });
    
    // Validate form
    const isFormValid = validateForm();
    if (!isFormValid) {
      return;
    }
    
    // Prepare role data
    const roleData: RoleCreationPayload = {
      name: nameValue,
      description: descriptionValue || undefined,
      isSystemRole: isSystemRoleValue
    };
    
    // Submit form
    setIsSubmitting(true);
    
    try {
      if (onCreateRole) {
        // Use custom create handler
        await onCreateRole(roleData);
        resetForm();
        
        // Refresh roles
        await fetchAllRoles();
      } else {
        // Use default hook
        const result = await createRole(roleData);
        
        if (result) {
          resetForm();
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create role';
      setFormErrors({ ...formErrors, form: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle update role
  const handleUpdateRole = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!currentRole) {
      return;
    }
    
    // Reset form error
    setFormErrors({ ...formErrors, form: undefined });
    
    // Mark fields as touched
    setTouched({
      name: true,
      description: true
    });
    
    // Validate form
    const isFormValid = validateForm();
    if (!isFormValid) {
      return;
    }
    
    // Prepare role data
    const roleData: RoleUpdatePayload = {
      name: nameValue,
      description: descriptionValue || undefined,
      isSystemRole: isSystemRoleValue
    };
    
    // Submit form
    setIsSubmitting(true);
    
    try {
      if (onUpdateRole) {
        // Use custom update handler
        await onUpdateRole(currentRole.id, roleData);
        resetForm();
        
        // Refresh roles
        await fetchAllRoles();
      } else {
        // Use default hook
        const result = await updateRole(currentRole.id, roleData);
        
        if (result) {
          resetForm();
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update role';
      setFormErrors({ ...formErrors, form: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle delete role
  const handleDeleteRole = useCallback(async (roleId: string) => {
    if (!roleId) return;
    
    setIsSubmitting(true);
    
    try {
      if (onDeleteRole) {
        // Use custom delete handler
        await onDeleteRole(roleId);
      } else {
        // Use default hook
        await deleteRole(roleId);
      }
      
      resetForm();
    } catch (error) {
      console.error('Failed to delete role:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [onDeleteRole, deleteRole]);
  
  // Assign permission to role
  const assignPermissionToRoleHandler = useCallback(async (roleId: string, permission: Permission) => {
    if (!roleId || !permission) return;
    
    setIsSubmitting(true);
    
    try {
      if (onAssignPermissions) {
        // Use custom assign handler
        await onAssignPermissions(roleId, [permission]);
      } else {
        // Use default hook
        await addPermissionToRole(roleId, permission);
      }
      
      // Refresh roles to get updated permissions
      await fetchAllRoles();
    } catch (error) {
      console.error('Failed to assign permission to role:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [onAssignPermissions, addPermissionToRole, fetchAllRoles]);
  
  // Remove permission from role
  const removePermissionFromRoleHandler = useCallback(async (roleId: string, permission: Permission) => {
    if (!roleId || !permission) return;
    
    setIsSubmitting(true);
    
    try {
      await removePermissionFromRole(roleId, permission);
      
      // Refresh roles to get updated permissions
      await fetchAllRoles();
    } catch (error) {
      console.error('Failed to remove permission from role:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [removePermissionFromRole, fetchAllRoles]);
  
  // Refresh roles
  const refreshRoles = useCallback(async () => {
    await fetchAllRoles();
  }, [fetchAllRoles]);
  
  // Fetch roles and permissions on mount
  useEffect(() => {
    fetchAllRoles();
  }, [fetchAllRoles]);
  
  // If there's a form error, display it
  useEffect(() => {
    if (error) {
      setFormErrors({ ...formErrors, form: error });
    }
  }, [error]);
  
  // Render the component using the render prop
  return render({
    // Role form state and handlers
    handleCreateRole,
    handleUpdateRole,
    handleDeleteRole,
    nameValue,
    setNameValue,
    descriptionValue,
    setDescriptionValue,
    isSystemRoleValue,
    setIsSystemRoleValue,
    isSubmitting,
    isValid,
    formErrors,
    touched,
    handleBlur,
    resetForm,
    
    // Role list state and handlers
    roles,
    currentRole,
    setCurrentRole,
    refreshRoles,
    
    // Permission management
    permissions,
    assignPermissionToRole: assignPermissionToRoleHandler,
    removePermissionFromRole: removePermissionFromRoleHandler,
    
    // General state
    isLoading,
    error,
    successMessage,
    isEditMode,
    setIsEditMode
  });
}
