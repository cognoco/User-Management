import { useEffect, useState } from 'react';
import { Badge } from '@/ui/primitives/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import { useRoleHierarchy } from '@/hooks/admin/useRoleHierarchy';
import { useApi } from '@/hooks/core/useApi';

interface Permission { id: string; name: string; }

interface Props {
  roleId: string;
  title?: string;
}

export function PermissionInheritanceVisualizer({ roleId, title }: Props): JSX.Element {
  const { fetchHierarchy } = useRoleHierarchy();
  const { fetchApi } = useApi();
  const [direct, setDirect] = useState<Permission[]>([]);
  const [inherited, setInherited] = useState<Permission[]>([]);
  const [effective, setEffective] = useState<Permission[]>([]);

  useEffect(() => {
    async function load(): Promise<void> {
      const hierarchy = await fetchHierarchy(roleId);
      const ancestorRoles = hierarchy?.ancestors || [];
      const directRes = await fetchApi<{ permissions: Permission[] }>(
        `/api/roles/${roleId}/permissions`,
      );
      const directPerms = directRes?.permissions || [];
      const inheritedPerms: Permission[] = [];
      for (const a of ancestorRoles) {
        const res = await fetchApi<{ permissions: Permission[] }>(
          `/api/roles/${a.id}/permissions`,
        );
        if (res) inheritedPerms.push(...res.permissions);
      }
      const effectivePerms = Array.from(
        new Map(
          [...directPerms, ...inheritedPerms].map((p) => [p.id, p]),
        ).values(),
      );
      setDirect(directPerms);
      setInherited(inheritedPerms.filter((p) => !directPerms.find((d) => d.id === p.id)));
      setEffective(effectivePerms);
    }
    load();
  }, [roleId, fetchHierarchy, fetchApi]);

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{title || roleId}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold">Direct Permissions</h4>
          <div className="flex flex-wrap gap-1">
            {direct.map((p) => (
              <Badge key={p.id} className="bg-blue-100 text-blue-800">
                {p.name}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold">Inherited Permissions</h4>
          <div className="flex flex-wrap gap-1">
            {inherited.map((p) => (
              <Badge key={p.id} className="bg-green-100 text-green-800">
                {p.name}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold">Effective Permissions</h4>
          <div className="flex flex-wrap gap-1">
            {effective.map((p) => (
              <Badge key={p.id} className="bg-gray-100 text-gray-800">
                {p.name}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
export default PermissionInheritanceVisualizer;
