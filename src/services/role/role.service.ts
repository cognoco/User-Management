import type {
  Role,
  RoleUpdateData,
  UserRoleAssignment,
  RoleHierarchyNode,
  RoleFilters,
  RoleService as IRoleService
} from '@/core/role/interfaces';
import { getServiceSupabase } from '@/lib/database/supabase';
import type { Permission } from '@/types/rbac';
import { MemoryCache } from '@/lib/cache';

export class RoleService implements IRoleService {
  private static permissionCache = new MemoryCache<string, Permission[]>({ ttl: 30_000 });
  
  constructor(
    private supabase = getServiceSupabase(),
    private maxHierarchyDepth = Infinity,
  ) {}

  async getAllRoles(filters?: RoleFilters): Promise<Role[]> {
    let query = this.supabase.from('roles').select('*');
    if (filters?.isSystemRole !== undefined) {
      query = query.eq('is_system_role', filters.isSystemRole);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data as Role[]) || [];
  }

  async getRoleById(id: string): Promise<Role | null> {
    const { data, error } = await this.supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as Role;
  }

  private async ensureUniqueName(name: string, excludeId?: string) {
    let query = this.supabase.from('roles').select('id').eq('name', name);
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    const { data, error } = await query.single();
    if (!error && data) {
      throw new Error('Role name must be unique');
    }
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
  }

  private async hasCircularDependency(roleId: string, parentId: string | null): Promise<boolean> {
    let current = parentId;
    const visited = new Set<string>();
    while (current) {
      if (current === roleId) return true;
      if (visited.has(current)) break;
      visited.add(current);
      const { data, error } = await this.supabase
        .from('roles')
        .select('parent_role_id')
        .eq('id', current)
        .single();
      if (error || !data) break;
      current = (data as { parent_role_id: string | null }).parent_role_id;
    }
    return false;
  }

  private async exceedsDepthLimit(parentId: string | null): Promise<boolean> {
    if (!parentId || this.maxHierarchyDepth === Infinity) return false;
    let depth = 1;
    let current: string | null = parentId;
    const visited = new Set<string>();
    while (current) {
      if (visited.has(current)) break;
      visited.add(current);
      if (depth >= this.maxHierarchyDepth) return true;
      const { data, error }: { data: { parent_role_id: string | null } | null; error: any } = await this.supabase
        .from('roles')
        .select('parent_role_id')
        .eq('id', current)
        .single();
      if (error || !data) break;
      current = data.parent_role_id;
      depth += 1;
    }
    return false;
  }

  async createRole(name: string, description = '', parentRoleId?: string | null): Promise<Role> {
    await this.ensureUniqueName(name);
    if (parentRoleId) {
      if (await this.hasCircularDependency('', parentRoleId)) {
        throw new Error('Circular role hierarchy');
      }
      if (await this.exceedsDepthLimit(parentRoleId)) {
        throw new Error('Role hierarchy depth limit exceeded');
      }
    }
    const { data, error } = await this.supabase
      .from('roles')
      .insert({ name, description, parent_role_id: parentRoleId })
      .select('*')
      .single();
    if (error) throw error;
    return data as Role;
  }

  async updateRole(id: string, data: RoleUpdateData): Promise<Role> {
    if (data.name) {
      await this.ensureUniqueName(data.name, id);
    }
    if (data.parentRoleId) {
      if (await this.hasCircularDependency(id, data.parentRoleId)) {
        throw new Error('Circular role hierarchy');
      }
      if (await this.exceedsDepthLimit(data.parentRoleId)) {
        throw new Error('Role hierarchy depth limit exceeded');
      }
    }
    const { data: updated, error } = await this.supabase
      .from('roles')
      .update({
        name: data.name,
        description: data.description,
        parent_role_id: data.parentRoleId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return updated as Role;
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.getRoleById(id);
    if (!role) return;
    if (role.isSystemRole) {
      throw new Error('Cannot delete system role');
    }
    const { error } = await this.supabase.from('roles').delete().eq('id', id);
    if (error) throw error;
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const { data, error } = await this.supabase
      .from('role_permissions')
      .select('permissions(*)')
      .eq('role_id', roleId);
    if (error) throw error;
    return (data || []).map((r: any) => r.permissions as Permission);
  }

  async getUserRoles(userId: string): Promise<UserRoleAssignment[]> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .select('*, roles(*)')
      .eq('user_id', userId);
    if (error) throw error;
    return (data || []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      roleId: r.role_id,
      assignedBy: r.assigned_by,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      role: r.roles ? ({
        id: r.roles.id,
        name: r.roles.name,
        description: r.roles.description,
        isSystemRole: r.roles.is_system_role,
        parentRoleId: r.roles.parent_role_id,
        createdAt: r.roles.created_at,
        updatedAt: r.roles.updated_at,
      } as Role) : undefined,
    }));
  }

  async setParentRole(roleId: string, parentRoleId: string | null): Promise<void> {
    if (parentRoleId) {
      if (await this.hasCircularDependency(roleId, parentRoleId)) {
        throw new Error('Circular role hierarchy');
      }
      if (await this.exceedsDepthLimit(parentRoleId)) {
        throw new Error('Role hierarchy depth limit exceeded');
      }
    }
    const { error } = await this.supabase
      .from('roles')
      .update({ parent_role_id: parentRoleId, updated_at: new Date().toISOString() })
      .eq('id', roleId);
    if (error) throw error;
  }

  async removeParentRole(roleId: string): Promise<void> {
    await this.setParentRole(roleId, null);
  }

  async getAncestorRoles(roleId: string): Promise<Role[]> {
    const ancestors: Role[] = [];
    const visited = new Set<string>();
    let current = await this.getRoleById(roleId);
    while (current?.parentRoleId) {
      const parentId = current.parentRoleId;
      if (visited.has(parentId)) break;
      const parent = await this.getRoleById(parentId);
      if (!parent) break;
      visited.add(parentId);
      ancestors.push(parent);
      current = parent;
    }
    return ancestors;
  }

  async getDescendantRoles(roleId: string): Promise<Role[]> {
    const allRoles = await this.getAllRoles();
    const descendants: Role[] = [];
    const visited = new Set<string>();
    const traverse = (id: string) => {
      for (const role of allRoles) {
        if (role.parentRoleId === id && !visited.has(role.id)) {
          visited.add(role.id);
          descendants.push(role);
          traverse(role.id);
        }
      }
    };
    traverse(roleId);
    return descendants;
  }

  async getRoleHierarchy(): Promise<RoleHierarchyNode[]> {
    const allRoles = await this.getAllRoles();
    const map = new Map<string, RoleHierarchyNode>();
    for (const role of allRoles) {
      map.set(role.id, { ...(role as RoleHierarchyNode), children: [] });
    }
    const roots: RoleHierarchyNode[] = [];
    for (const node of Array.from(map.values())) {
      if (node.parentRoleId) {
        const parent = map.get(node.parentRoleId);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async getEffectivePermissions(roleId: string): Promise<Permission[]> {
    return RoleService.permissionCache.getOrCreate(roleId, async () => {
      const visited = new Set<string>();
      const ids: string[] = [];
      let current: string | undefined = roleId;
      while (current && !visited.has(current)) {
        visited.add(current);
        ids.push(current);
        const role = await this.getRoleById(current);
        current = role?.parentRoleId || undefined;
      }

      if (ids.length === 0) return [];

      const { data, error } = await this.supabase
        .from('role_permissions')
        .select('permissions(*)')
        .in('role_id', ids);

      if (error) throw error;

      const perms = new Set<Permission>();
      for (const r of data || []) {
        perms.add(r.permissions as Permission);
      }

      return Array.from(perms);
    });
  }
}
