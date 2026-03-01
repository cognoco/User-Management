// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ResourcePermissionAssigner } from '../ResourcePermissionAssigner';
import * as usePermissionsHook from '@/hooks/permission/usePermissions';
import * as useHierarchyHook from '@/hooks/resource/useResourceHierarchy';

vi.mock('@/hooks/permission/usePermissions');
vi.mock('@/hooks/resource/useResourceHierarchy');

describe('ResourcePermissionAssigner', () => {
  it('calls assign and revoke handlers', async () => {
    const assign = vi.fn();
    const revoke = vi.fn();
    vi.mocked(usePermissionsHook.usePermissions).mockReturnValue({
      assignResourcePermission: assign,
      removeResourcePermission: revoke,
    } as any);
    vi.mocked(useHierarchyHook.default).mockReturnValue({
      tree: { id: 'root', type: 'project', children: [] },
      refresh: vi.fn(),
    } as any);

    const renderProp = vi.fn((_props: any) => null);
    renderHook(() => (
      <ResourcePermissionAssigner userId="1" rootType="project" rootId="1" render={renderProp} />
    ));

    expect(renderProp).toHaveBeenCalled();
    const args = renderProp.mock.calls[0]?.[0];
    expect(args).toBeDefined();
    await act(async () => {
      await args!.assign('project', '1', 'VIEW_PROJECTS');
    });
    expect(assign).toHaveBeenCalled();
    await act(async () => {
      await args!.revoke('project', '1', 'VIEW_PROJECTS');
    });
    expect(revoke).toHaveBeenCalled();
  });
});
