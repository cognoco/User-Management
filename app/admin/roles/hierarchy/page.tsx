'use client';

import { useEffect } from 'react';
import { RoleHierarchyTree } from '@/ui/styled/permission/RoleHierarchyTree';
import { useRoleHierarchy } from '@/hooks/permission/useRoleHierarchy';

export default function RoleHierarchyPage() {
  const { hierarchy, isLoading, error, fetchHierarchy, moveRole } = useRoleHierarchy();

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  if (isLoading) {
    return (
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">Role Hierarchy Management</h1>
        <p className="text-muted-foreground">Loading hierarchy…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">Role Hierarchy Management</h1>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Role Hierarchy Management</h1>
      <RoleHierarchyTree tree={hierarchy} onMove={moveRole} />
    </div>
  );
}
