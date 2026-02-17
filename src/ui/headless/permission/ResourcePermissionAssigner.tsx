import { useState, useCallback, useEffect } from 'react';
import { Permission } from '@/core/permission/models';
import { ResourcePermissionResolver } from '@/lib/services/resource-permission-resolver.service';
import { usePermissions } from '@/hooks/permission/usePermissions';
import useResourceHierarchy, { ResourceNode } from '@/hooks/resource/useResourceHierarchy';
import { api } from '@/lib/api/axios';

export interface ResourcePermissionAssignerProps {
  userId: string;
  rootType: string;
  rootId: string;
  render: (props: {
    tree: ResourceNode | null;
    assign: (resourceType: string, resourceId: string, permission: Permission) => Promise<void>;
    revoke: (resourceType: string, resourceId: string, permission: Permission) => Promise<void>;
    getEffective: (resourceType: string, resourceId: string) => Promise<Permission[]>;
    isLoading: boolean;
    error: string | null;
  }) => React.ReactNode;
}

export function ResourcePermissionAssigner({ userId, rootType, rootId, render }: ResourcePermissionAssignerProps) {
  usePermissions(); // Load permissions context
  const assignResourcePermission = async (userId: string, resourceType: string, resourceId: string, permission: string) => {
    const res = await api.post('/permissions/resource/assign', { userId, resourceType, resourceId, permission });
    return res.data;
  };
  const removeResourcePermission = async (userId: string, resourceType: string, resourceId: string, permission: string) => {
    const res = await api.delete('/permissions/resource/remove', { data: { userId, resourceType, resourceId, permission } });
    return res.data;
  };
  const { tree, refresh } = useResourceHierarchy(rootType, rootId);
  const [resolver] = useState(() => new ResourcePermissionResolver());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assign = useCallback(async (type: string, id: string, perm: Permission) => {
    setIsLoading(true);
    setError(null);
    try {
      await assignResourcePermission(userId, perm, type, id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'assign failed');
    } finally {
      setIsLoading(false);
    }
  }, [assignResourcePermission, userId, refresh]);

  const revoke = useCallback(async (type: string, id: string, perm: Permission) => {
    setIsLoading(true);
    setError(null);
    try {
      await removeResourcePermission(userId, perm, type, id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'revoke failed');
    } finally {
      setIsLoading(false);
    }
  }, [removeResourcePermission, userId, refresh]);

  const getEffective = useCallback((type: string, id: string) => {
    return resolver.getEffectivePermissions(userId, type, id) as Promise<Permission[]>;
  }, [resolver, userId]);

  return <>{render({ tree, assign, revoke, getEffective, isLoading, error })}</>;
}
export default ResourcePermissionAssigner;
