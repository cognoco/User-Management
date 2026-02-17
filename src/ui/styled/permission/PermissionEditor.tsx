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
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/primitives/table';
import { CheckCircledIcon, ExclamationTriangleIcon, ReloadIcon } from '@radix-ui/react-icons';
import { Permission } from '@/core/permission/models';

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
  description = 'View and manage permissions for your application',
  footer,
  className,
  ...headlessProps
}: StyledPermissionEditorProps) {
  return (
    <HeadlessPermissionEditor
      {...headlessProps}
      render={({
        permissions,
        filteredPermissions,
        permissionGroups,
        filterValue,
        setFilterValue,
        refreshPermissions,
        syncPermissions,
        isLoading,
        error,
        successMessage,
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

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4 gap-2">
              <Input
                placeholder="Search permissions..."
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="max-w-xs"
                disabled={isLoading}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshPermissions}
                  disabled={isLoading}
                >
                  <ReloadIcon className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncPermissions}
                  disabled={isLoading}
                >
                  Sync
                </Button>
              </div>
            </div>

            {isLoading ? (
              <p className="text-sm text-gray-500 py-6 text-center">Loading permissions…</p>
            ) : filteredPermissions.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No permissions found.</p>
            ) : (
              <div className="space-y-6">
                {permissionGroups.map((group) => (
                  <div key={group.name}>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">{group.name}</h3>
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Permission Key</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.permissions.map((permission: Permission) => (
                            <TableRow key={permission as string}>
                              <TableCell>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 font-mono">
                                  {permission as string}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-4">
              Total: {permissions.length} permissions
            </p>
          </CardContent>

          {footer && <CardFooter>{footer}</CardFooter>}
        </Card>
      )}
    />
  );
}
