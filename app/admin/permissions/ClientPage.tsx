'use client';

import { Skeleton } from '@/ui/primitives/skeleton';
import { Alert, AlertDescription } from '@/ui/primitives/alert';

import { PermissionEditor } from '@/ui/styled/permission/PermissionEditor';

export default function PermissionsManagementPageClient(): JSX.Element {
  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Permission Management</h1>
        <p className="text-muted-foreground">
          View and manage permissions for your application
        </p>
      </div>

      <PermissionEditor />
    </div>
  );
}
