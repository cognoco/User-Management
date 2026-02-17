import { RoleHierarchyTree } from '@/ui/styled/permission/RoleHierarchyTree';

export default function RoleHierarchyPage() {
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Role Hierarchy Management</h1>
      <RoleHierarchyTree />
    </div>
  );
}
