import React, { useState } from 'react';
import { Checkbox } from '@/ui/primitives/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Button } from '@/ui/primitives/button';
import { PermissionValues, type Permission } from '@/core/permission/models';
import { ResourcePermissionAssigner, ResourcePermissionAssignerProps } from '../../headless/permission/ResourcePermissionAssigner';

interface ResourceNode {
  id: string;
  type: string;
  children: ResourceNode[];
}

interface NodeProps {
  node: ResourceNode;
  getEffective: (t: string, id: string) => Promise<Permission[]>;
  assign: (t: string, id: string, p: Permission) => Promise<void>;
  revoke: (t: string, id: string, p: Permission) => Promise<void>;
  level: number;
}

function Node({ node, getEffective, assign, revoke, level }: NodeProps): JSX.Element {
  const [effective, setEffective] = useState<Permission[]>([]);
  const [expanded, setExpanded] = useState(false);
  const allPermissions = Object.values(PermissionValues);

  const load = async (): Promise<void> => {
    setEffective(await getEffective(node.type, node.id));
    setExpanded(true);
  };

  return (
    <div className="ml-4">
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" onClick={expanded ? () => setExpanded(false) : load}>
          {expanded ? '-' : '+'}
        </Button>
        <span className="font-medium">{node.type}:{node.id}</span>
      </div>
      {expanded && (
        <div className="ml-6 space-y-2">
          {allPermissions.map(p => {
            const has = effective.includes(p);
            return (
              <label key={p} className="flex items-center space-x-2">
                <Checkbox
                  checked={has}
                  onCheckedChange={(v) => {
                    if (v) assign(node.type, node.id, p); else revoke(node.type, node.id, p);
                  }}
                />
                <span className={has ? '' : 'opacity-50'}>{p}</span>
              </label>
            );
          })}
          {node.children.map((c: ResourceNode) => (
            <Node key={c.id} node={c} getEffective={getEffective} assign={assign} revoke={revoke} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ResourcePermissionAssignerStyled(props: Omit<ResourcePermissionAssignerProps, 'render'> & { title?: string }): JSX.Element {
  return (
    <ResourcePermissionAssigner
      {...props}
      render={({ tree, assign, revoke, getEffective, error }) => (
        <Card>
          <CardHeader>
            <CardTitle>{props.title || 'Resource Permissions'}</CardTitle>
          </CardHeader>
          <CardContent>
            {error && <p className="text-red-500">{error}</p>}
            {!tree ? (
              <p>Loading...</p>
            ) : (
              <Node node={tree} getEffective={getEffective} assign={assign} revoke={revoke} level={0} />
            )}
          </CardContent>
        </Card>
      )}
    />
  );
}
export default ResourcePermissionAssignerStyled;
