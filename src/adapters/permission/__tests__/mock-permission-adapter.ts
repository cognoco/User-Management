import { IPermissionDataProvider } from '@/core/permission/IPermissionDataProvider';
import { Role, Permission, UserRole, ResourcePermission } from '@/core/permission/models';

export class MockPermissionAdapter implements IPermissionDataProvider {
  private roles: Map<string, Role> = new Map();
  private permissions: Map<string, Permission> = new Map();
  private userRoles: Map<string, UserRole[]> = new Map();
  private resourcePermissions: Map<string, ResourcePermission[]> = new Map();

  constructor() {
    // Set up default mock data
    const adminRole: Role = {
      id: 'role-admin',
      name: 'admin',
      description: 'Administrator role',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      permissions: [
        { name: 'user:read', description: 'Read user data' },
        { name: 'user:write', description: 'Write user data' },
        { name: 'team:read', description: 'Read team data' },
        { name: 'team:write', description: 'Write team data' }
      ]
    };
    this.roles.set('role-admin', adminRole);

    const userRole: UserRole = {
      id: 'user-role-123',
      userId: 'user-123',
      roleId: 'role-admin',
      assignedBy: 'system',
      assignedAt: new Date().toISOString(),
    };
    this.userRoles.set('user-123', [userRole]);

    // Default permissions
    const permissions: Permission[] = [
      { name: 'user:read', description: 'Read user data' },
      { name: 'user:write', description: 'Write user data' },
      { name: 'team:read', description: 'Read team data' },
      { name: 'team:write', description: 'Write team data' },
    ];
    permissions.forEach(p => this.permissions.set(p.name, p));
  }

  async getRoles(): Promise<Role[]> {
    return Array.from(this.roles.values());
  }

  async getRole(roleId: string): Promise<Role | null> {
    return this.roles.get(roleId) || null;
  }

  async createRole(name: string, description?: string, permissions?: string[]): Promise<{ success: boolean; role?: Role; error?: string }> {
    const roleId = `role-${Date.now()}`;
    const role: Role = {
      id: roleId,
      name,
      description: description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      permissions: permissions?.map(p => this.permissions.get(p)).filter(Boolean) as Permission[] || []
    };

    this.roles.set(roleId, role);
    return { success: true, role };
  }

  async updateRole(roleId: string, name?: string, description?: string, permissions?: string[]): Promise<{ success: boolean; role?: Role; error?: string }> {
    const role = this.roles.get(roleId);
    if (!role) {
      return { success: false, error: 'Role not found' };
    }

    const updated: Role = {
      ...role,
      name: name || role.name,
      description: description !== undefined ? description : role.description,
      permissions: permissions ? permissions.map(p => this.permissions.get(p)).filter(Boolean) as Permission[] : role.permissions,
      updatedAt: new Date().toISOString(),
    };

    this.roles.set(roleId, updated);
    return { success: true, role: updated };
  }

  async deleteRole(roleId: string): Promise<{ success: boolean; error?: string }> {
    const deleted = this.roles.delete(roleId);
    return { success: deleted, error: deleted ? undefined : 'Role not found' };
  }

  async getPermissions(): Promise<Permission[]> {
    return Array.from(this.permissions.values());
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    return this.userRoles.get(userId) || [];
  }

  async assignRoleToUser(userId: string, roleId: string, assignedBy: string): Promise<{ success: boolean; userRole?: UserRole; error?: string }> {
    const role = this.roles.get(roleId);
    if (!role) {
      return { success: false, error: 'Role not found' };
    }

    const userRoles = this.userRoles.get(userId) || [];
    
    // Check if user already has this role
    if (userRoles.some(ur => ur.roleId === roleId)) {
      return { success: false, error: 'User already has this role' };
    }

    const userRole: UserRole = {
      id: `user-role-${Date.now()}`,
      userId,
      roleId,
      assignedBy,
      assignedAt: new Date().toISOString(),
    };

    userRoles.push(userRole);
    this.userRoles.set(userId, userRoles);

    return { success: true, userRole };
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<{ success: boolean; error?: string }> {
    const userRoles = this.userRoles.get(userId) || [];
    const roleIndex = userRoles.findIndex(ur => ur.roleId === roleId);
    
    if (roleIndex === -1) {
      return { success: false, error: 'User role not found' };
    }

    userRoles.splice(roleIndex, 1);
    this.userRoles.set(userId, userRoles);

    return { success: true };
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const userRoles = await this.getUserRoles(userId);
    const permissions: Permission[] = [];
    const seen = new Set<string>();

    for (const userRole of userRoles) {
      const role = this.roles.get(userRole.roleId);
      if (role) {
        for (const permission of role.permissions) {
          if (!seen.has(permission.name)) {
            permissions.push(permission);
            seen.add(permission.name);
          }
        }
      }
    }

    return permissions;
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.some(p => p.name === permission);
  }

  async hasRole(userId: string, roleName: string): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    for (const userRole of userRoles) {
      const role = this.roles.get(userRole.roleId);
      if (role && role.name === roleName) {
        return true;
      }
    }
    return false;
  }

  async grantResourcePermission(
    userId: string,
    resourceType: string,
    resourceId: string,
    permission: string,
    grantedBy: string
  ): Promise<{ success: boolean; resourcePermission?: ResourcePermission; error?: string }> {
    const resourcePermissions = this.resourcePermissions.get(userId) || [];
    
    const resourcePermission: ResourcePermission = {
      id: `resource-perm-${Date.now()}`,
      userId,
      resourceType,
      resourceId,
      permission,
      grantedBy,
      grantedAt: new Date().toISOString(),
    };

    resourcePermissions.push(resourcePermission);
    this.resourcePermissions.set(userId, resourcePermissions);

    return { success: true, resourcePermission };
  }

  async revokeResourcePermission(userId: string, resourceType: string, resourceId: string, permission: string): Promise<{ success: boolean; error?: string }> {
    const resourcePermissions = this.resourcePermissions.get(userId) || [];
    const permIndex = resourcePermissions.findIndex(rp => 
      rp.resourceType === resourceType && 
      rp.resourceId === resourceId && 
      rp.permission === permission
    );
    
    if (permIndex === -1) {
      return { success: false, error: 'Resource permission not found' };
    }

    resourcePermissions.splice(permIndex, 1);
    this.resourcePermissions.set(userId, resourcePermissions);

    return { success: true };
  }

  async hasResourcePermission(userId: string, resourceType: string, resourceId: string, permission: string): Promise<boolean> {
    const resourcePermissions = this.resourcePermissions.get(userId) || [];
    return resourcePermissions.some(rp => 
      rp.resourceType === resourceType && 
      rp.resourceId === resourceId && 
      rp.permission === permission
    );
  }

  async getUserResourcePermissions(userId: string, resourceType?: string): Promise<ResourcePermission[]> {
    const resourcePermissions = this.resourcePermissions.get(userId) || [];
    if (resourceType) {
      return resourcePermissions.filter(rp => rp.resourceType === resourceType);
    }
    return resourcePermissions;
  }

  // Helper methods for testing
  setMockRole(role: Role) {
    this.roles.set(role.id, role);
  }

  setMockUserRoles(userId: string, userRoles: UserRole[]) {
    this.userRoles.set(userId, userRoles);
  }

  clearMockData() {
    this.roles.clear();
    this.permissions.clear();
    this.userRoles.clear();
    this.resourcePermissions.clear();
  }
}