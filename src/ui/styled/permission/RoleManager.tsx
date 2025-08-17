/**
 * Styled Role Manager Component
 * 
 * This component provides a default styled implementation of the headless RoleManager.
 * It uses the headless component for behavior and adds UI rendering with Shadcn UI components.
 */

import React, { useState } from 'react';
import { RoleManager as HeadlessRoleManager, RoleManagerProps } from '../../headless/permission/RoleManager';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ExclamationTriangleIcon, CheckCircledIcon, TrashIcon } from '@radix-ui/react-icons';

export interface StyledRoleManagerProps extends Omit<RoleManagerProps, 'render'> {
  /**
   * Optional title for the role manager
   */
  title?: string;
  
  /**
   * Optional description for the role manager
   */
  description?: string;
  
  /**
   * Optional footer content
   */
  footer?: React.ReactNode;
  
  /**
   * Optional className for styling
   */
  className?: string;
}

export function RoleManager({
  title = 'Role Management',
  description = 'Create and manage roles and their permissions',
  footer,
  className,
  ...headlessProps
}: StyledRoleManagerProps) {
  // Local state for confirmation dialog
  const [confirmationState, setConfirmationState] = useState<{
    roleId: string | null;
    roleName: string;
    isOpen: boolean;
  }>({
    roleId: null,
    roleName: '',
    isOpen: false
  });

  return (
    <HeadlessRoleManager
      {...headlessProps}
      render={({
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
        isValid,
        formErrors,
        touched,
        handleBlur,
        resetForm,
        // Role list state and handlers
        roles,
        currentRole,
        setCurrentRole,
        // Permission management
        permissions,
        assignPermissionToRole,
        removePermissionFromRole,
        // General state
        isLoading,
        error,
        successMessage,
        isEditMode,
      }) => (
        <Card className={className}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            {successMessage && (
              <Alert className="mb-6 bg-green-50 border-green-200">
                <CheckCircledIcon className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert variant="destructive" className="mb-6">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="roles" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="roles">Roles</TabsTrigger>
                <TabsTrigger value="form">
                  {isEditMode ? 'Edit Role' : 'Create Role'}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="roles" className="space-y-4">
                <div className="grid gap-4">
                  {roles.map((role) => (
                    <Card key={role.id} className="cursor-pointer hover:bg-gray-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div 
                            className="flex-1"
                            onClick={() => setCurrentRole(role)}
                          >
                            <h4 className="font-medium">{role.name}</h4>
                            <p className="text-sm text-gray-500">{role.description}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {role.permissions?.length || 0} permissions
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentRole(role)}
                            >
                              Edit
                            </Button>
                            {!role.isSystemRole && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={isLoading}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmationState({ 
                                        roleId: role.id, 
                                        roleName: role.name,
                                        isOpen: true 
                                      });
                                    }}
                                  >
                                    <TrashIcon className="h-4 w-4 text-red-500" />
                                  </Button>
                                </DialogTrigger>
                                {confirmationState.isOpen && confirmationState.roleId === role.id && (
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Delete Role</DialogTitle>
                                      <DialogDescription>
                                        Are you sure you want to delete the \"{confirmationState.roleName}\" role? 
                                        This action cannot be undone and may affect users with this role.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter className="flex space-x-2 justify-end">
                                      <Button
                                        variant="outline"
                                        onClick={() => setConfirmationState({ roleId: null, roleName: '', isOpen: false })}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        onClick={async () => {
                                          await handleDeleteRole(role.id);
                                          setConfirmationState({ roleId: null, roleName: '', isOpen: false });
                                        }}
                                      >
                                        Delete Role
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                )}
                              </Dialog>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="form" className="space-y-4">
                <form onSubmit={isEditMode ? handleUpdateRole : handleCreateRole} className="space-y-4">
                  {formErrors.form && (
                    <Alert variant="destructive">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <AlertDescription>{formErrors.form}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="role-name">Role Name</Label>
                    <Input
                      id="role-name"
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      onBlur={() => handleBlur('name')}
                      placeholder="Enter role name"
                      disabled={isLoading}
                    />
                    {touched.name && formErrors.name && (
                      <p className="text-sm text-red-600">{formErrors.name}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role-description">Description</Label>
                    <Textarea
                      id="role-description"
                      value={descriptionValue}
                      onChange={(e) => setDescriptionValue(e.target.value)}
                      onBlur={() => handleBlur('description')}
                      placeholder="Enter role description"
                      disabled={isLoading}
                    />
                    {touched.description && formErrors.description && (
                      <p className="text-sm text-red-600">{formErrors.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is-system-role"
                      checked={isSystemRoleValue}
                      onCheckedChange={(checked) => setIsSystemRoleValue(checked as boolean)}
                      disabled={isLoading || isEditMode}
                    />
                    <Label htmlFor="is-system-role">System Role (cannot be deleted)</Label>
                  </div>
                  
                  <div className="space-y-4">
                    <Label>Permissions</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                      {permissions.map((permission) => {
                        const isSelected = currentRole?.permissions?.includes(permission) || false;
                        return (
                          <div key={permission} className="flex items-start space-x-2 p-2 border rounded-md">
                            <Checkbox
                              id={`permission-${permission}`}
                              checked={isSelected}
                              onCheckedChange={async (checked) => {
                                if (!currentRole) return;
                                if (checked) {
                                  await assignPermissionToRole(currentRole.id, permission);
                                } else {
                                  await removePermissionFromRole(currentRole.id, permission);
                                }
                              }}
                              disabled={isLoading || isSystemRoleValue}
                            />
                            <div className="space-y-1">
                              <Label
                                htmlFor={`permission-${permission}`}
                                className="font-medium text-sm"
                              >
                                {permission.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                              </Label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    {isEditMode ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            resetForm();
                            setCurrentRole(null);
                          }}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={isLoading || !isValid || isSystemRoleValue}
                        >
                          {isLoading ? 'Saving...' : 'Update Role'}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={resetForm}
                          disabled={isLoading}
                        >
                          Reset
                        </Button>
                        <Button
                          type="submit"
                          disabled={isLoading || !isValid}
                        >
                          {isLoading ? 'Creating...' : 'Create Role'}
                        </Button>
                      </>
                    )}
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          {footer && (
            <CardFooter>
              {footer}
            </CardFooter>
          )}
        </Card>
      )}
    />
  );
}