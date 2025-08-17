import { useState, useMemo } from 'react';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/primitives/select';
import type { RoleHierarchyNode } from '@/services/role';
import { validateParentSelection } from '@/utils/hierarchy';

export interface ParentRoleSelectorProps {
  roles: RoleHierarchyNode[];
  childRoleId: string;
  value: string | null;
  onChange: (parentRoleId: string | null) => void;
}

export function ParentRoleSelector({ roles, childRoleId, value, onChange }: ParentRoleSelectorProps): JSX.Element {
  const [invalid, setInvalid] = useState(false);

  const flatRoles = useMemo(() => {
    const all: RoleHierarchyNode[] = [];
    const traverse = (nodes: RoleHierarchyNode[]) => {
      nodes.forEach(n => {
        all.push(n);
        traverse(n.children);
      });
    };
    traverse(roles);
    return all;
  }, [roles]);

  const handleChange = (val: string) => {
    const newVal = val === '' ? null : val;
    const valid = validateParentSelection(roles, childRoleId, newVal);
    setInvalid(!valid);
    if (valid) {
      onChange(newVal);
    }
  };

  return (
    <div>
      <Select value={value ?? ''} onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select parent role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">None</SelectItem>
          {flatRoles.map(r => (
            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {invalid && (
        <div className="flex items-center mt-1 text-destructive text-sm">
          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
          Invalid parent role selection
        </div>
      )}
    </div>
  );
}
