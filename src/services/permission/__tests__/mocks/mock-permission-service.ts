// src/services/permission/__tests__/mocks/mock-permission-service.ts
import { vi } from 'vitest';
import { PermissionService } from '../../../../core/permission/interfaces';
import { 
  Permission, 
  Role, 
  RoleWithPermissions, 
  UserRole,
  PermissionAssignment,
  RoleCreationPayload,
  RoleUpdatePayload
} from '../../../../core/permission/models';
import {
  PermissionEventHandler,
  PermissionEventTypes,
} from '../../../../core/permission/events';

/**
 * Mock implementation of the PermissionService interface for testing
 */
export class MockPermissionService implements PermissionService {
  private permissionEventHandlers: PermissionEventHandler[] = [];
  private mockRoles: Record<string, RoleWithPermissions> = {};
  private mockPermissions: Permission[] = [];
  private mockUserRoles: Record<string, UserRole[]> = {}; // userId -> UserRole[]
  private mockRolePermissions: Record<string, Permission[]> = {}; // roleId -> Permission[]
  
  constructor() {
    // Initialize with some default permissions
    this.mockPermissions = [
      { name: 'user:read', description: 'Read user data' },
      { name: 'user:write', description: 'Write user data' },
      { name: 'team:read', description: 'Read team data' },
      { name: 'team:write', description: 'Write team data' },
      { name: 'permission:read', description: 'Read permission data' },
      { name: 'permission:write', description: 'Write permission data' }
    ];
    
    // Initialize with some default roles
    this.createRole({
      name: 'admin',
      description: 'Administrator with all permissions',
      permissions: this.mockPermissions
    });
    
    this.createRole({
      name: 'user',
      description: 'Regular user with limited permissions',
      permissions: [
        { name: 'user:read', description: 'Read user data' },
        { name: 'team:read', description: 'Read team data' }
      ]
    });
  }

  // Mock implementations with Vitest spies
  hasPermission = vi.fn().mockImplementation(async (userId: string, permission: Permission): Promise<boolean> => {
    // Get all roles assigned to the user
    const userRoles = this.mockUserRoles[userId] || [];
    
    // Check if any of the user's roles has the permission
    for (const userRole of userRoles) {
      const rolePermissions = this.mockRolePermissions[userRole.roleId] || [];
      if (rolePermissions.some(p => p.name === permission.name)) {
        return true;
      }
    }
    
    return false;
  });

  hasRole = vi.fn().mockImplementation(async (userId: string, role: Role): Promise<boolean> => {
    const userRoles = this.mockUserRoles[userId] || [];
    return userRoles.some(ur => {
      const userRole = this.mockRoles[ur.roleId];
      return userRole && userRole.name === role.name;
    });
  });

  getAllRoles = vi.fn().mockImplementation(async (): Promise<RoleWithPermissions[]> => {
    return Object.values(this.mockRoles);
  });

  getRoleById = vi.fn().mockImplementation(async (roleId: string): Promise<RoleWithPermissions | null> => {
    return this.mockRoles[roleId] || null;
  });

  createRole = vi.fn().mockImplementation(async (roleData: RoleCreationPayload): Promise<RoleWithPermissions> => {
    const roleId = `role-${Date.now()}`;
    const role: RoleWithPermissions = {
      id: roleId,
      name: roleData.name,
      description: roleData.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      permissions: roleData.permissions || []
    };
    
    this.mockRoles[roleId] = role;
    this.mockRolePermissions[roleId] = [...(roleData.permissions || [])];
    
    this._emitEvent({
      type: PermissionEventTypes.ROLE_CREATED,
      payload: { role }
    });
    
    return role;
  });

  updateRole = vi.fn().mockImplementation(async (roleId: string, roleData: RoleUpdatePayload): Promise<RoleWithPermissions> => {
    if (!this.mockRoles[roleId]) {
      throw new Error('Role not found');
    }
    
    const updatedRole: RoleWithPermissions = {
      ...this.mockRoles[roleId],
      ...roleData,
      updatedAt: new Date().toISOString()
    };
    
    // Update permissions if provided
    if (roleData.permissions) {
      updatedRole.permissions = roleData.permissions;
      this.mockRolePermissions[roleId] = [...roleData.permissions];
    }
    
    this.mockRoles[roleId] = updatedRole;
    
    this._emitEvent({
      type: PermissionEventTypes.ROLE_UPDATED,
      payload: { role: updatedRole }
    });
    
    return updatedRole;
  });

  deleteRole = vi.fn().mockImplementation(async (roleId: string): Promise<boolean> => {
    if (!this.mockRoles[roleId]) {
      return false;
    }
    
    // Store role data for potential future use (e.g., undo functionality)
    // const deletedRole = { ...this.mockRoles[roleId] };
    delete this.mockRoles[roleId];
    delete this.mockRolePermissions[roleId];
    
    // Remove this role from all users
    Object.keys(this.mockUserRoles).forEach(userId => {
      this.mockUserRoles[userId] = this.mockUserRoles[userId].filter(ur => ur.roleId !== roleId);
    });
    
    this._emitEvent({
      type: PermissionEventTypes.ROLE_DELETED,
      payload: { roleId }
    });
    
    return true;
  });

  getUserRoles = vi.fn().mockImplementation(async (userId: string): Promise<UserRole[]> => {
    return this.mockUserRoles[userId] || [];
  });

  assignRoleToUser = vi.fn().mockImplementation(async (
    userId: string, 
    roleId: string, 
    assignedBy: string, 
    expiresAt?: Date
  ): Promise<UserRole> => {
    if (!this.mockRoles[roleId]) {
      throw new Error('Role not found');
    }
    
    const userRole: UserRole = {
      id: `user-role-${Date.now()}`,
      userId,
      roleId,
      assignedBy,
      assignedAt: new Date().toISOString(),
      expiresAt: expiresAt?.toISOString()
    };
    
    if (!this.mockUserRoles[userId]) {
      this.mockUserRoles[userId] = [];
    }
    
    // Check if user already has this role
    const existingRoleIndex = this.mockUserRoles[userId].findIndex(ur => ur.roleId === roleId);
    if (existingRoleIndex !== -1) {
      // Update existing role assignment
      this.mockUserRoles[userId][existingRoleIndex] = userRole;
    } else {
      // Add new role assignment
      this.mockUserRoles[userId].push(userRole);
    }
    
    this._emitEvent({
      type: PermissionEventTypes.ROLE_ASSIGNED,
      payload: { userRole }
    });
    
    return userRole;
  });

  removeRoleFromUser = vi.fn().mockImplementation(async (userId: string, roleId: string): Promise<boolean> => {
    if (!this.mockUserRoles[userId]) {
      return false;
    }
    
    const initialLength = this.mockUserRoles[userId].length;
    this.mockUserRoles[userId] = this.mockUserRoles[userId].filter(ur => ur.roleId !== roleId);
    
    const removed = initialLength > this.mockUserRoles[userId].length;
    
    if (removed) {
      this._emitEvent({
        type: PermissionEventTypes.ROLE_REMOVED,
        payload: { userId, roleId }
      });
    }
    
    return removed;
  });

  roleHasPermission = vi.fn().mockImplementation(async (roleId: string, permission: Permission): Promise<boolean> => {
    const permissions = this.mockRolePermissions[roleId] || [];
    return permissions.some(p => p.name === permission.name);
  });

  addPermissionToRole = vi.fn().mockImplementation(async (roleId: string, permission: Permission): Promise<PermissionAssignment> => {
    if (!this.mockRoles[roleId]) {
      throw new Error('Role not found');
    }
    
    // Check if permission already exists
    if (!this.mockPermissions.some(p => p.name === permission.name)) {
      this.mockPermissions.push(permission);
    }
    
    // Check if role already has this permission
    if (!this.mockRolePermissions[roleId]) {
      this.mockRolePermissions[roleId] = [];
    }
    
    const hasPermission = this.mockRolePermissions[roleId].some(p => p.name === permission.name);
    if (!hasPermission) {
      this.mockRolePermissions[roleId].push(permission);
      
      // Update the role's permissions array
      this.mockRoles[roleId].permissions = [...this.mockRolePermissions[roleId]];
    }
    
    const permissionAssignment: PermissionAssignment = {
      id: `permission-assignment-${Date.now()}`,
      roleId,
      permission,
      assignedAt: new Date().toISOString()
    };
    
    this._emitEvent({
      type: PermissionEventTypes.PERMISSION_ADDED,
      payload: { roleId, permission }
    });
    
    return permissionAssignment;
  });

  removePermissionFromRole = vi.fn().mockImplementation(async (roleId: string, permission: Permission): Promise<boolean> => {
    if (!this.mockRoles[roleId] || !this.mockRolePermissions[roleId]) {
      return false;
    }
    
    const initialLength = this.mockRolePermissions[roleId].length;
    this.mockRolePermissions[roleId] = this.mockRolePermissions[roleId].filter(p => p.name !== permission.name);
    
    // Update the role's permissions array
    this.mockRoles[roleId].permissions = [...this.mockRolePermissions[roleId]];
    
    const removed = initialLength > this.mockRolePermissions[roleId].length;
    
    if (removed) {
      this._emitEvent({
        type: PermissionEventTypes.PERMISSION_REMOVED,
        payload: { roleId, permission }
      });
    }
    
    return removed;
  });

  getAllPermissions = vi.fn().mockImplementation(async (): Promise<Permission[]> => {
    return [...this.mockPermissions];
  });

  getRolePermissions = vi.fn().mockImplementation(async (roleId: string): Promise<Permission[]> => {
    return this.mockRolePermissions[roleId] || [];
  });

  syncRolePermissions = vi.fn().mockImplementation(async (): Promise<boolean> => {
    // This is a no-op in the mock implementation
    return true;
  });

  onPermissionEvent = vi.fn().mockImplementation((handler: PermissionEventHandler): (() => void) => {
    this.permissionEventHandlers.push(handler);
    return () => {
      const index = this.permissionEventHandlers.indexOf(handler);
      if (index !== -1) {
        this.permissionEventHandlers.splice(index, 1);
      }
    };
  });

  // Helper methods
  private _emitEvent(event: Parameters<PermissionEventHandler>[0]): void {
    this.permissionEventHandlers.forEach(handler => handler(event));
  }

  // Methods to control mock behavior in tests
  setMockRole(role: RoleWithPermissions): void {
    this.mockRoles[role.id] = role;
    this.mockRolePermissions[role.id] = [...role.permissions];
  }

  setMockUserRoles(userId: string, roles: UserRole[]): void {
    this.mockUserRoles[userId] = roles;
  }

  setMockPermissions(permissions: Permission[]): void {
    this.mockPermissions = permissions;
  }

  clearMocks(): void {
    this.mockRoles = {};
    this.mockPermissions = [];
    this.mockUserRoles = {};
    this.mockRolePermissions = {};
    this.permissionEventHandlers = [];
  }
}
