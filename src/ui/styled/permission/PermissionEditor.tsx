/**
 * Styled Permission Editor Component
 * 
 * This component provides a default styled implementation of the headless PermissionEditor.
 * It uses the headless component for behavior and adds UI rendering with Shadcn UI components.
 */

import React from 'react';
import { PermissionEditor as HeadlessPermissionEditor, PermissionEditorProps } from '../../headless/permission/PermissionEditor';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Label } from '@/ui/primitives/label';
import { Textarea } from '@/ui/primitives/textarea';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/primitives/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/primitives/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/ui/primitives/dialog';
import { ExclamationTriangleIcon, CheckCircledIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';

export interface StyledPermissionEditorProps extends Omit<PermissionEditorProps, 'render'> {
  /**
   * Optional title for the permission editor
   */
  title?: string;
  
  /**
   * Optional description for the permission editor
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

export function PermissionEditor({
  title = 'Permission Management',
  description = 'Create and manage permissions for your application',
  footer,
  className,
  ...headlessProps
}: StyledPermissionEditorProps): JSX.Element {
  return (
    <HeadlessPermissionEditor
      {...headlessProps}
      render={({
        permissions,
        categories,
        selectedPermission,
        setSelectedPermission,
        permissionForm,
        updatePermissionForm,
        handleCreatePermission,
        handleUpdatePermission,
        isLoading,
        error,
        isSuccess,
        successMessage,
        confirmationState,
        setConfirmationState,
        handleConfirmDelete,
        cancelConfirmation,
        isEditMode,
        setIsEditMode,
        resetPermissionForm,
        handleCreateCategory,
        categoryForm,
        updateCategoryForm,
        resetCategoryForm,
        isCategoryDialogOpen,
        setIsCategoryDialogOpen
      }) => (
        <Card className={className}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess && (
              <Alert className="mb-6 bg-green-50 border-green-200">
                <CheckCircledIcon className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {successMessage || 'Operation completed successfully'}
                </AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert variant="destructive" className="mb-6">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Permissions List Panel */}
              <div className="md:col-span-1 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Permissions</h3>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        resetPermissionForm();
                        setIsEditMode(false);
                        setSelectedPermission(null);
                      }}
                      disabled={isLoading}
                    >
                      <PlusIcon className="h-4 w-4 mr-1" /> New Permission
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        resetCategoryForm();
                        setIsCategoryDialogOpen(true);
                      }}
                      disabled={isLoading}
                    >
                      <PlusIcon className="h-4 w-4 mr-1" /> New Category
                    </Button>
                  </div>
                </div>
                
                <div className="border rounded-md overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Permission</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {permissions.map((permission) => (
                          <TableRow 
                            key={permission.id}
                            className={selectedPermission?.id === permission.id ? 'bg-slate-100' : ''}
                          >
                            <TableCell 
                              className="cursor-pointer"
                              onClick={() => {
                                setSelectedPermission(permission);
                                updatePermissionForm('name', permission.name);
                                updatePermissionForm('description', permission.description);
                                updatePermissionForm('category', permission.category);
                                updatePermissionForm('key', permission.key);
                                setIsEditMode(true);
                              }}
                            >
                              <div>
                                <p className="font-medium">{permission.name}</p>
                                <p className="text-xs text-gray-500">{permission.key}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {categories.find(c => c.id === permission.category)?.name || 'Uncategorized'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {!permission.isSystem && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={isLoading}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmationState({ 
                                          permissionId: permission.id, 
                                          permissionName: permission.name,
                                          isOpen: true 
                                        });
                                      }}
                                    >
                                      <TrashIcon className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </DialogTrigger>
                                  {confirmationState.isOpen && confirmationState.permissionId === permission.id && (
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Delete Permission</DialogTitle>

                                          <DialogDescription>
                                            Are you sure you want to delete the &quot;{confirmationState.permissionName}&quot; permission? This action cannot be undone and may affect roles using this permission.
                                          </DialogDescription>

                                      </DialogHeader>
                                      <DialogFooter className="flex space-x-2 justify-end">
                                        <Button
                                          variant="outline"
                                          onClick={cancelConfirmation}
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          onClick={() => handleConfirmDelete(permission.id)}
                                        >
                                          Delete Permission
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  )}
                                </Dialog>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        
                        {permissions.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-6 text-gray-500">
                              No permissions defined
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
              
              {/* Permission Editor Panel */}
              <div className="md:col-span-2 space-y-6">
                <h3 className="text-lg font-medium">
                  {isEditMode ? `Edit Permission: ${selectedPermission?.name}` : 'Create New Permission'}
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="permissionName">Permission Name</Label>
                    <Input
                      id="permissionName"
                      value={permissionForm.name}
                      onChange={(e) => updatePermissionForm('name', e.target.value)}
                      disabled={isLoading || (isEditMode && selectedPermission?.isSystem)}
                      placeholder="e.g., Create User, Edit Post"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="permissionKey">Permission Key</Label>
                    <Input
                      id="permissionKey"
                      value={permissionForm.key}
                      onChange={(e) => updatePermissionForm('key', e.target.value)}
                      disabled={isLoading || (isEditMode && selectedPermission?.isSystem)}
                      placeholder="e.g., users:create, posts:edit"
                    />
                    <p className="text-xs text-gray-500">
                      A unique identifier for this permission, used in code
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="permissionCategory">Category</Label>
                    <Select
                      value={permissionForm.category}
                      onValueChange={(value) => updatePermissionForm('category', value)}
                      disabled={isLoading || (isEditMode && selectedPermission?.isSystem)}
                    >
                      <SelectTrigger id="permissionCategory">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="permissionDescription">Description</Label>
                    <Textarea
                      id="permissionDescription"
                      value={permissionForm.description}
                      onChange={(e) => updatePermissionForm('description', e.target.value)}
                      disabled={isLoading || (isEditMode && selectedPermission?.isSystem)}
                      placeholder="Describe what this permission allows users to do"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    {isEditMode ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => {
                            resetPermissionForm();
                            setIsEditMode(false);
                            setSelectedPermission(null);
                          }}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleUpdatePermission(selectedPermission?.id)}
                          disabled={isLoading || !permissionForm.name || !permissionForm.key || (selectedPermission?.isSystem)}
                        >
                          {isLoading ? 'Saving...' : 'Update Permission'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={handleCreatePermission}
                        disabled={isLoading || !permissionForm.name || !permissionForm.key}
                      >
                        {isLoading ? 'Creating...' : 'Create Permission'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Category Dialog */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Category</DialogTitle>
                  <DialogDescription>
                    Create a new category to organize your permissions
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoryName">Category Name</Label>
                    <Input
                      id="categoryName"
                      value={categoryForm.name}
                      onChange={(e) => updateCategoryForm('name', e.target.value)}
                      disabled={isLoading}
                      placeholder="e.g., User Management, Content"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="categoryDescription">Description</Label>
                    <Textarea
                      id="categoryDescription"
                      value={categoryForm.description}
                      onChange={(e) => updateCategoryForm('description', e.target.value)}
                      disabled={isLoading}
                      placeholder="Describe the types of permissions in this category"
                      rows={3}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetCategoryForm();
                      setIsCategoryDialogOpen(false);
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      handleCreateCategory();
                      setIsCategoryDialogOpen(false);
                    }}
                    disabled={isLoading || !categoryForm.name}
                  >
                    Create Category
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
          
          {footer && <CardFooter>{footer}</CardFooter>}
        </Card>
      )}
    />
  );
}
