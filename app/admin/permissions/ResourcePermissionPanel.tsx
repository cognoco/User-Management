'use client';
import { useState, useEffect } from 'react';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Select } from '@/ui/primitives/select';
import { UserManagementConfiguration } from '@/core/config';
import type { PermissionService } from '@/core/permission/interfaces';
import { usePermission } from '@/hooks/permission/usePermissions';
import { PermissionValues, type Permission } from '@/core/permission/models';

interface ResourcePermission {
  userId: string;
  permission: string;
}

export default function ResourcePermissionPanel() {
  const { hasPermission, isLoading } = usePermission({
    required: PermissionValues.MANAGE_ROLES,
  });

  const permissionService =
    UserManagementConfiguration.getServiceProvider<PermissionService>('permissionService');

  const [resourceType, setResourceType] = useState('team');
  const [resourceId, setResourceId] = useState('');
  const [permissions, setPermissions] = useState<ResourcePermission[]>([]);
  const [userId, setUserId] = useState('');
  const [permission, setPermission] = useState('');

  const fetchPermissions = async () => {
    if (!permissionService || !resourceId) return;
    const perms = await permissionService.getPermissionsForResource(resourceType, resourceId);
    setPermissions(perms as unknown as ResourcePermission[]);
  };

  const grantPermission = async () => {
    if (!permissionService || !userId || !permission || !resourceId) return;
    await permissionService.assignResourcePermission(
      userId,
      permission as Permission,
      resourceType,
      resourceId,
    );
    fetchPermissions();
  };

  const revokePermission = async (uid: string, perm: string) => {
    if (!permissionService) return;
    await permissionService.removeResourcePermission(uid, perm as Permission, resourceType, resourceId);
    fetchPermissions();
  };

  useEffect(() => {
    if (hasPermission) {
      fetchPermissions();
    }
  }, [resourceType, resourceId, hasPermission]);

  if (isLoading) {
    return <div className="animate-pulse">Loading permissions...</div>;
  }

  if (!hasPermission) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Resource Permissions</h2>
      <div className="flex items-center space-x-2">
        <label>Resource Type:</label>
        <Select value={resourceType} onValueChange={setResourceType}>
          <option value="team">Team</option>
          <option value="project">Project</option>
          <option value="document">Document</option>
        </Select>
        <Input
          placeholder="Resource ID"
          value={resourceId}
          onChange={(e) => setResourceId(e.target.value)}
        />
        <Button onClick={fetchPermissions}>Load</Button>
      </div>
      {resourceId && (
        <>
          <ul className="space-y-1">
            {permissions.map((p) => (
              <li key={`${p.userId}-${p.permission}`} className="flex items-center gap-2">
                <span>
                  {p.userId} - {p.permission}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokePermission(p.userId, p.permission)}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <Input placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
            <Input
              placeholder="Permission"
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
            />
            <Button onClick={grantPermission}>Grant</Button>
          </div>
        </>
      )}
    </div>
  );
}
