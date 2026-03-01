// src/services/permission/__tests__/mocks/mock-permission-service.ts
import { vi } from 'vitest';
import { PermissionService } from '../../../../core/permission/interfaces';
import { 
  Permission, 
  PermissionValues,
  Role, 
  RoleWithPermissions, 
  UserRole,
  PermissionAssignment,
  RoleCreationPayload,
  RoleUpdatePayload,
  ResourcePermission,
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
  private mockResourcePermissions: ResourcePermission[] = [];
  
  constructor() {
    // Initialize with some default permissions
    this.mockPermissions = [
      PermissionValues.EDIT_USER_PROFILES,
      PermissionValues.VIEW_TEAM_MEMBERS,
      PermissionValues.MANAGE_TEAMS,
      PermissionValues.MANAGE_ROLES,
      PermissionValues.VIEW_ANALYTICS,
      PermissionValues.EXPORT_DATA,
    ];
    
    // Initialize with some default roles
    this.createRole({
      name: 'admin',
      description: 'Administrator with all permissions',
      permissions: [...this.mockPermissions],
    });
    
    this.createRole({
      name: 'user',
      description: 'Regular user with limited permissions',
      permissions: [
        PermissionValues.EDIT_USER_PROFILES,
        PermissionValues.VIEW_TEAM_MEMBERS,
      ],
    });
  }

  // Mock implementations with Vitest spies
  hasPermission = vi.fn().mockImplementation(async (userId: string, permission: Permission): Promise<boolean> => {
    const userRoles = this.mockUserRoles[userId] || [];
    for (const userRole of userRoles) {
      const rolePermissions = this.mockRolePermissions[userRole.roleId] || [];
      if (rolePermissions.includes(permission)) {
        return true;
      }
    }
    return false;
  });

  hasRole = vi.fn().mockImplementation(async (userId: string, role: Role): Promise<boolean> => {
    const userRoles = this.mockUserRoles[userId] || [];
    return userRoles.some(ur => {
      const roleEntity = this.mockRoles[ur.roleId];
      return roleEntity && roleEntity.name === role;
    });
  });

  getAllRoles = vi.fn().mockImplementation(async (): Promise<RoleWithPermissions[]> => {
    return Object.values(this.mockRoles);
  });

  getRoleById = vi.fn().mockImplementation(async (roleId: string): Promise<RoleWithPermissions | null> => {
    return this.mockRoles[roleId] || null;
  });

  createRole = vi.fn().mockImplementation(async (
    roleData: RoleCreationPayload,
    _performedBy?: string,
    _reason?: string,
    _ticket?: string,
  ): Promise<RoleWithPermissions> => {
    const roleId = `role-${Date.now()}`;
    const now = new Date();
    const role: RoleWithPermissions = {
      id: roleId,
      name: roleData.name,
      description: roleData.description || '',
      isSystemRole: roleData.isSystemRole,
      createdAt: now,
      updatedAt: now,
      permissions: roleData.permissions || [],
    };
    
    this.mockRoles[roleId] = role;
    this.mockRolePermissions[roleId] = [...(roleData.permissions || [])];
    
    this._emitEvent({
      type: PermissionEventTypes.ROLE_CREATED,
      timestamp: now,
      role,
    });
    
    return role;
  });

  updateRole = vi.fn().mockImplementation(async (
    roleId: string,
    roleData: RoleUpdatePayload,
    _performedBy?: string,
    _reason?: string,
    _ticket?: string,
  ): Promise<RoleWithPermissions> => {
    if (!this.mockRoles[roleId]) {
      throw new Error('Role not found');
    }
    
    const now = new Date();
    const previousRole = { ...this.mockRoles[roleId] };
    const updatedRole: RoleWithPermissions = {
      ...this.mockRoles[roleId],
      ...(roleData.name !== undefined && { name: roleData.name }),
      ...(roleData.description !== undefined && { description: roleData.description }),
      ...(roleData.isSystemRole !== undefined && { isSystemRole: roleData.isSystemRole }),
      updatedAt: now,
      permissions: roleData.permissions ?? this.mockRoles[roleId].permissions,
    };
    
    if (roleData.permissions) {
      this.mockRolePermissions[roleId] = [...roleData.permissions];
    }
    
    this.mockRoles[roleId] = updatedRole;
    
    this._emitEvent({
      type: PermissionEventTypes.ROLE_UPDATED,
      timestamp: now,
      role: updatedRole,
      previousRole,
    });
    
    return updatedRole;
  });

  deleteRole = vi.fn().mockImplementation(async (
    roleId: string,
    _performedBy?: string,
    _reason?: string,
    _ticket?: string,
  ): Promise<boolean> => {
    if (!this.mockRoles[roleId]) {
      return false;
    }
    
    delete this.mockRoles[roleId];
    delete this.mockRolePermissions[roleId];
    
    // Remove this role from all users
    Object.keys(this.mockUserRoles).forEach(userId => {
      this.mockUserRoles[userId] = this.mockUserRoles[userId].filter(ur => ur.roleId !== roleId);
    });
    
    this._emitEvent({
      type: PermissionEventTypes.ROLE_DELETED,
      timestamp: new Date(),
      roleId,
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
    
    const now = new Date();
    const userRole: UserRole = {
      id: `user-role-${Date.now()}`,
      userId,
      roleId,
      assignedBy,
      createdAt: now,
      expiresAt,
    };
    
    if (!this.mockUserRoles[userId]) {
      this.mockUserRoles[userId] = [];
    }
    
    const existingRoleIndex = this.mockUserRoles[userId].findIndex(ur => ur.roleId === roleId);
    if (existingRoleIndex !== -1) {
      this.mockUserRoles[userId][existingRoleIndex] = userRole;
    } else {
      this.mockUserRoles[userId].push(userRole);
    }
    
    this._emitEvent({
      type: PermissionEventTypes.ROLE_ASSIGNED,
      timestamp: now,
      userRole,
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
        timestamp: new Date(),
        userId,
        roleId,
      });
    }
    
    return removed;
  });

  roleHasPermission = vi.fn().mockImplementation(async (roleId: string, permission: Permission): Promise<boolean> => {
    const permissions = this.mockRolePermissions[roleId] || [];
    return permissions.includes(permission);
  });

  addPermissionToRole = vi.fn().mockImplementation(async (roleId: string, permission: Permission): Promise<PermissionAssignment> => {
    if (!this.mockRoles[roleId]) {
      throw new Error('Role not found');
    }
    
    if (!this.mockPermissions.includes(permission)) {
      this.mockPermissions.push(permission);
    }
    
    if (!this.mockRolePermissions[roleId]) {
      this.mockRolePermissions[roleId] = [];
    }
    
    if (!this.mockRolePermissions[roleId].includes(permission)) {
      this.mockRolePermissions[roleId].push(permission);
      this.mockRoles[roleId].permissions = [...this.mockRolePermissions[roleId]];
    }
    
    const now = new Date();
    const permissionAssignment: PermissionAssignment = {
      id: `permission-assignment-${Date.now()}`,
      roleId,
      permission,
      createdAt: now,
    };
    
    this._emitEvent({
      type: PermissionEventTypes.PERMISSION_ADDED,
      timestamp: now,
      roleId,
      permission,
    });
    
    return permissionAssignment;
  });

  removePermissionFromRole = vi.fn().mockImplementation(async (roleId: string, permission: Permission): Promise<boolean> => {
    if (!this.mockRoles[roleId] || !this.mockRolePermissions[roleId]) {
      return false;
    }
    
    const initialLength = this.mockRolePermissions[roleId].length;
    this.mockRolePermissions[roleId] = this.mockRolePermissions[roleId].filter(p => p !== permission);
    this.mockRoles[roleId].permissions = [...this.mockRolePermissions[roleId]];
    
    const removed = initialLength > this.mockRolePermissions[roleId].length;
    
    if (removed) {
      this._emitEvent({
        type: PermissionEventTypes.PERMISSION_REMOVED,
        timestamp: new Date(),
        roleId,
        permission,
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

  // Resource permission methods
  assignResourcePermission = vi.fn().mockImplementation(async (
    userId: string,
    permission: Permission,
    resourceType: string,
    resourceId: string,
    _performedBy?: string,
    _reason?: string,
    _ticket?: string,
  ): Promise<ResourcePermission> => {
    const rp: ResourcePermission = {
      id: `rp-${Date.now()}`,
      userId,
      permission,
      resourceType,
      resourceId,
      createdAt: new Date(),
    };
    this.mockResourcePermissions.push(rp);
    return rp;
  });

  removeResourcePermission = vi.fn().mockImplementation(async (
    userId: string,
    permission: Permission,
    resourceType: string,
    resourceId: string,
  ): Promise<boolean> => {
    const initialLength = this.mockResourcePermissions.length;
    this.mockResourcePermissions = this.mockResourcePermissions.filter(rp =>
      !(rp.userId === userId && rp.permission === permission &&
        rp.resourceType === resourceType && rp.resourceId === resourceId)
    );
    return this.mockResourcePermissions.length < initialLength;
  });

  hasResourcePermission = vi.fn().mockImplementation(async (
    userId: string,
    permission: Permission,
    resourceType: string,
    resourceId: string,
  ): Promise<boolean> => {
    return this.mockResourcePermissions.some(rp =>
      rp.userId === userId && rp.permission === permission &&
      rp.resourceType === resourceType && rp.resourceId === resourceId
    );
  });

  getUserResourcePermissions = vi.fn().mockImplementation(async (userId: string): Promise<ResourcePermission[]> => {
    return this.mockResourcePermissions.filter(rp => rp.userId === userId);
  });

  getPermissionsForResource = vi.fn().mockImplementation(async (
    resourceType: string,
    resourceId: string,
  ): Promise<ResourcePermission[]> => {
    return this.mockResourcePermissions.filter(rp =>
      rp.resourceType === resourceType && rp.resourceId === resourceId
    );
  });

  getUsersWithResourcePermission = vi.fn().mockImplementation(async (
    resourceType: string,
    resourceId: string,
    permission: Permission,
  ): Promise<string[]> => {
    return this.mockResourcePermissions
      .filter(rp => rp.resourceType === resourceType && rp.resourceId === resourceId && rp.permission === permission)
      .map(rp => rp.userId);
  });

  syncRolePermissions = vi.fn().mockImplementation(async (): Promise<boolean> => {
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
    this.mockResourcePermissions = [];
    this.permissionEventHandlers = [];
  }
}
