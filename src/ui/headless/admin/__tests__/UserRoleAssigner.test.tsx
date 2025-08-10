// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UserRoleAssigner } from '../UserRoleAssigner';
import * as adminUsers from '@/hooks/admin/useAdminUsers';
import * as useRolesHook from '@/hooks/team/useRoles';
import { UserManagementConfiguration } from '@/core/config';
import { PermissionService } from '@/core/permission/interfaces';

vi.mock('@/hooks/admin/useAdminUsers');
vi.mock('@/hooks/team/useRoles');

describe('UserRoleAssigner', () => {
  it('assigns and removes roles', async () => {
    const searchUsers = vi.fn();
    const assignRoleToUser = vi.fn().mockResolvedValue(true);
    const removeRoleFromUser = vi.fn().mockResolvedValue(true);
    
    vi.mocked(adminUsers.useAdminUsers).mockReturnValue({ 
      users: [{ id: 'u1', firstName: 'A', email: 'test@example.com' }], 
      searchUsers, 
      isLoading: false, 
      error: null 
    });
    
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

    const renderProp = vi.fn(({ search, selectUser, assign, remove }: any) => {
      // Test the props passed to render function
      expect(search).toBeInstanceOf(Function);
      expect(selectUser).toBeInstanceOf(Function);
      expect(assign).toBeInstanceOf(Function);
      expect(remove).toBeInstanceOf(Function);
      return null;
    });
    
    const { result } = renderHook(() => {
      return UserRoleAssigner({ render: renderProp });
    });
    
    // Wait for the component to render and call the render prop
    expect(renderProp).toHaveBeenCalled();
    
    // Get the props from the render function call
    const renderProps = renderProp.mock.calls[0][0];
    
    await act(async () => {
      await renderProps.search('x');
    });
    
    act(() => {
      renderProps.selectUser('u1');
    });
    
    await act(async () => {
      await renderProps.assign('r1');
    });
    
    await act(async () => {
      await renderProps.remove('r1');
    });
    
    expect(searchUsers).toHaveBeenCalledWith({ query: 'x' });
    expect(assignRoleToUser).toHaveBeenCalled();
    expect(removeRoleFromUser).toHaveBeenCalled();
  });
});