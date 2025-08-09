
"use client";

import React, { useMemo, useCallback } from 'react';
import ReactFlow, { Background, Controls, MiniMap, Node, Edge, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import type { RoleHierarchyNode } from '@/services/role';
import type { Permission } from '@/types/rbac';

interface TreeNode extends RoleHierarchyNode {
  permissions: Permission[];
}

export interface RoleHierarchyTreeProps {
  tree: TreeNode[];
  onMove?: (roleId: string, newParentId: string | null) => void;
}

const RoleNode = ({ role, permissions }: { role: TreeNode; permissions: Permission[] }) => (
  <div className="p-4 border rounded-md bg-card" title={`Inherited: ${permissions.length} permissions`}>
    <h3 className="font-medium">{role.name}</h3>
    <p className="text-xs text-muted-foreground">{permissions.length} permissions</p>
  </div>
);

export function RoleHierarchyTree({ tree, onMove }: RoleHierarchyTreeProps) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const traverse = (items: TreeNode[], parentId: string | null, depth = 0) => {
      items.forEach((r, index) => {
        nodes.push({
          id: r.id,
          data: { role: r, permissions: r.permissions },
          position: { x: index * 200, y: depth * 120 },
          type: 'roleNode',
        });
        if (parentId) {
          edges.push({ id: `${parentId}-${r.id}`, source: parentId, target: r.id });
        }
        traverse(r.children as TreeNode[], r.id, depth + 1);
      });
    };
    traverse(tree, null);
    return { nodes, edges };
  }, [tree]);

  const onNodeDragStop = useCallback(
    (_: any, node: Node) => {
      if (!onMove) return;
      const edge = edges.find(e => e.target === node.id);
      const parentId = edge?.source || null;
      onMove(node.id, parentId);
    },
    [edges, onMove]
  );

  const nodeTypes = useMemo(
    () => ({ roleNode: ({ data }: { data: { role: TreeNode; permissions: Permission[] } }) => <RoleNode role={data.role} permissions={data.permissions} /> }),
    []
  );

  return (
    <ReactFlowProvider>
      <div className="w-full h-[500px]">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodeDragStop={onNodeDragStop} fitView>
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}

