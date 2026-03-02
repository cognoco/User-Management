'use client';

import React from 'react';
import { Skeleton } from '@/ui/primitives/skeleton';
import { Alert, AlertDescription } from '@/ui/primitives/alert';

import { RoleManager } from '@/ui/styled/permission/RoleManager';
import { useRoles } from '@/hooks/team/useRoles';
import { usePermissions } from '@/hooks/permission/usePermissions';

export default function RolesManagementPageClient(): React.ReactElement {
  const {
    roles,
    isLoading: rolesLoading,
    error: rolesError,
    createRole,
    updateRole,
    deleteRole,
    currentRole: selectedRole,
    setCurrentRole: setSelectedRole
  } = useRoles();

  const {
    permissions,
    isLoading: permissionsLoading,
    error: permissionsError
  } = usePermissions();

  const isLoading = rolesLoading || permissionsLoading;
  const error = rolesError || permissionsError;

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
        <p className="text-muted-foreground">
          Manage user roles and permissions
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : error ? (
        <Alert variant="destructive" className="my-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <RoleManager
          onCreateRole={async (data) => { await createRole(data); }}
          onUpdateRole={async (id, data) => { await updateRole(id, data); }}
          onDeleteRole={async (id) => { await deleteRole(id); }}
        />
      )}
    </div>
  );
}
