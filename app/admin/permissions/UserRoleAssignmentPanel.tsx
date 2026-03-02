'use client';
import { useEffect, useMemo } from 'react';
import { useAdminUsers } from '@/hooks/admin/useAdminUsers';
import RoleManagementPanel from '@/ui/styled/admin/RoleManagementPanel';
import { usePermission } from '@/hooks/permission/usePermissions';
import { PermissionValues } from '@/core/permission/models';
import { User } from '@/types/user';
import { UserType } from '@/types/user-type';

export default function UserRoleAssignmentPanel() {
  const { users, searchUsers } = useAdminUsers();
  const { hasPermission, isLoading } = usePermission({
    required: PermissionValues.MANAGE_ROLES,
  });

  useEffect(() => {
    searchUsers({});
  }, [searchUsers]);
  if (isLoading) {
    return <div className="animate-pulse">Loading permissions...</div>;
  }

  if (!hasPermission) {
    return null;
  }

  // Map hook's admin user shape to canonical User type
  const mappedUsers: User[] = useMemo(
    () =>
      users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        fullName: `${u.firstName} ${u.lastName}`.trim(),
        isActive: u.status === 'active',
        isVerified: true,
        userType: UserType.PRIVATE,
        createdAt: u.createdAt,
      })),
    [users],
  );

  return <RoleManagementPanel users={mappedUsers} />;
}
