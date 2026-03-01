// @vitest-environment jsdom
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UserRoleAssigner, UserRoleAssignerProps } from '../UserRoleAssigner';
import * as adminUsers from '@/hooks/admin/useAdminUsers';
import * as useRolesHook from '@/hooks/team/useRoles';
import { UserManagementConfiguration } from '@/core/config';
import { PermissionService } from '@/core/permission/interfaces';

vi.mock('@/hooks/admin/useAdminUsers');
vi.mock('@/hooks/team/useRoles');

describe('UserRoleAssigner', () => {
  it('assigns and removes roles', async () => {
    const searchUsers = vi.fn();
    vi.mocked(adminUsers.useAdminUsers).mockReturnValue({
      users: [{ id: 'u1', firstName: 'A', lastName: 'B', email: 'a@b.com', status: 'active', role: 'user', createdAt: '2025-01-01', lastLoginAt: null }],
      pagination: null,
      searchUsers,
      refreshSearch: vi.fn(),
      isLoading: false,
      error: null,
      isRealtimeConnected: false,
      setUsers: vi.fn(),
      setPagination: vi.fn(),
    });
    const assignRoleToUser = vi.fn();
    const removeRoleFromUser = vi.fn();
    vi.mocked(useRolesHook.useRoles).mockReturnValue({
      roles: [{ id: 'r1', name: 'Admin' }],
      assignRoleToUser,
      removeRoleFromUser,
      getUserRoles: vi.fn().mockResolvedValue([]),
      isLoading: false,
    } as any);
    const permissionService: PermissionService = {
      getUserResourcePermissions: vi.fn().mockResolvedValue([]),
    } as any;
    vi.spyOn(UserManagementConfiguration, 'getServiceProvider').mockReturnValue(permissionService);

    const renderProp = vi.fn(() => null) as any;
    render(<UserRoleAssigner render={renderProp} />);
    let args = renderProp.mock.calls[0][0] as Parameters<UserRoleAssignerProps['render']>[0];
    await act(async () => {
      await args.search('x');
    });
    await act(async () => {
      args = renderProp.mock.calls.at(-1)![0] as Parameters<UserRoleAssignerProps['render']>[0];
      args.selectUser('u1');
    });
    args = renderProp.mock.calls.at(-1)![0] as Parameters<UserRoleAssignerProps['render']>[0];
    await act(async () => {
      await args.assign('r1');
    });
    args = renderProp.mock.calls.at(-1)![0] as Parameters<UserRoleAssignerProps['render']>[0];
    await act(async () => {
      await args.remove('r1');
    });
    expect(searchUsers).toHaveBeenCalled();
    expect(assignRoleToUser).toHaveBeenCalled();
    expect(removeRoleFromUser).toHaveBeenCalled();
  });
});
