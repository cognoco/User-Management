// lib/services/roleHierarchy.service.ts
import { getServiceSupabase } from '@/lib/database/supabase';

export class RoleHierarchyService {
  private db;
  
  constructor() {
    this.db = getServiceSupabase();
  }
  
  /**
   * Check if adding parent would create a cycle
   */
  async wouldCreateCycle(childRoleId: string, parentRoleId: string): Promise<boolean> {
    // Check if parent is already a descendant of child (which would create a cycle)
    const descendants = await this.getDescendantRoles(childRoleId);
    return descendants.some(role => role.id === parentRoleId);
  }
  
  /**
   * Set the parent role for a given role
   */
  async setParentRole(childRoleId: string, parentRoleId: string | null, createdBy?: string): Promise<void> {
    // If parentRoleId is null, remove all parent relationships
    if (parentRoleId === null) {
      await this.db
        .from('role_hierarchy')
        .delete()
        .eq('child_role_id', childRoleId);
      return;
    }
    
    // Check for cycles
    if (await this.wouldCreateCycle(childRoleId, parentRoleId)) {
      throw new Error('Setting this parent would create a circular dependency in the role hierarchy');
    }
    
    // First, remove any existing parent relationships
    await this.db
      .from('role_hierarchy')
      .delete()
      .eq('child_role_id', childRoleId);
    
    // Then add the new parent relationship
    await this.db
      .from('role_hierarchy')
      .insert({
        parent_role_id: parentRoleId,
        child_role_id: childRoleId,
        created_by: createdBy
      });
  }
  
  /**
   * Get all ancestor roles (parent, grandparent, etc.)
   */
  async getAncestorRoles(roleId: string, maxDepth = 10): Promise<any[]> {
    const ancestors: any[] = [];
    let currentRoleId = roleId;
    let depth = 0;
    
    while (depth < maxDepth) {
      // Get the parent role
      const { data: parentRelationship } = await this.db
        .from('role_hierarchy')
        .select('parent_role_id')
        .eq('child_role_id', currentRoleId)
        .maybeSingle();
      
      if (!parentRelationship) break;
      
      // Get the parent role details
      const { data: parentRole } = await this.db
        .from('roles')
        .select('*')
        .eq('id', parentRelationship.parent_role_id)
        .single();
      
      if (!parentRole) break;
      
      ancestors.push(parentRole);
      currentRoleId = parentRole.id;
      depth++;
    }
    
    return ancestors;
  }
  
  /**
   * Get all descendant roles (children, grandchildren, etc.)
   */
  async getDescendantRoles(roleId: string, maxDepth = 10): Promise<any[]> {
    const descendants: any[] = [];
    const processedRoleIds = new Set<string>();
    
    const getChildren = async (parentId: string, currentDepth: number) => {
      if (currentDepth >= maxDepth) return;
      
      // Get immediate children
      const { data: childRelationships } = await this.db
        .from('role_hierarchy')
        .select('child_role_id')
        .eq('parent_role_id', parentId);
      
      if (!childRelationships || childRelationships.length === 0) return;
      
      // Process each child
      for (const relationship of childRelationships) {
        const childId = relationship.child_role_id;
        
        // Skip if we've already processed this role (prevents infinite loops)
        if (processedRoleIds.has(childId)) continue;
        processedRoleIds.add(childId);
        
        // Get the child role details
        const { data: childRole } = await this.db
          .from('roles')
          .select('*')
          .eq('id', childId)
          .single();
        
        if (childRole) {
          descendants.push(childRole);
          
          // Recursively get this child's children
          await getChildren(childId, currentDepth + 1);
        }
      }
    };
    
    await getChildren(roleId, 0);
    return descendants;
  }
  
  /**
   * Get all inherited permissions from ancestor roles
   */
  async getInheritedPermissions(roleId: string): Promise<string[]> {
    const ancestors = await this.getAncestorRoles(roleId);
    
    if (ancestors.length === 0) return [];
    
    // Get permissions for all ancestor roles
    const permissionsPromises = ancestors.map(ancestor => {
      return this.db
        .from('role_permissions')
        .select('permission')
        .eq('role_id', ancestor.id);
    });
    
    const permissionsResults = await Promise.all(permissionsPromises);
    
    // Combine all permissions
    const inheritedPermissions = new Set<string>();
    permissionsResults.forEach(result => {
      if (result.data) {
        result.data.forEach((p: any) => inheritedPermissions.add(p.permission));
      }
    });
    
    return Array.from(inheritedPermissions);
  }
  
  /**
   * Get all effective permissions for a role (direct + inherited)
   */
  async getEffectivePermissions(roleId: string): Promise<string[]> {
    // Get direct permissions
    const { data: directPermissions } = await this.db
      .from('role_permissions')
      .select('permission')
      .eq('role_id', roleId);
    
    const directPerms = directPermissions?.map((p: any) => p.permission) || [];
    
    // Get inherited permissions
    const inheritedPerms = await this.getInheritedPermissions(roleId);
    
    // Combine direct and inherited permissions
    return [...new Set([...directPerms, ...inheritedPerms])];
  }
}

export function createRoleHierarchyService() {
  return new RoleHierarchyService();
}
