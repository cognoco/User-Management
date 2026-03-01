import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withPermissionCheck } from '../permissions';
import { getApiAuthService } from '@/services/auth/factory';
import { Permission } from '@/lib/rbac/roles';
import { getApiPermissionService } from '@/services/permission/factory';
import { prisma } from '@/lib/database/prisma'; // Prisma client for user/team data

vi.mock('@/services/auth/factory');
vi.mock('@/services/permission/factory');
vi.mock('@/lib/database/prisma', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
    },
    team_members: {
      findUnique: vi.fn(),
    },
  },
}));

const mockAuthService = {
  getSession: vi.fn(),
};
const mockPermissionService = {
  hasPermission: vi.fn(),
  getUserRoles: vi.fn(),
};

vi.mocked(getApiAuthService).mockReturnValue(mockAuthService as any);
vi.mocked(getApiPermissionService).mockReturnValue(mockPermissionService as any);

// Mock user and team data for consistency
const mockUser = { id: 'user-1', email: 'test@example.com' };
const mockTeamMember = { userId: 'user-1', teamId: 'team-1', roleId: 'role-1' };

// Mock checkRolePermission if it's an external utility
const checkRolePermission = vi.fn();
vi.mock('@/lib/rbac/utils', () => ({
  checkRolePermission: checkRolePermission,
}));


const mockHandler = vi.fn().mockResolvedValue(new NextResponse('ok'));
const mockRequest = new NextRequest(new URL('http://localhost'));

describe('withPermissionCheck', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getApiAuthService).mockReturnValue(mockAuthService as any);
    vi.mocked(getApiPermissionService).mockReturnValue(mockPermissionService as any);
    mockPermissionService.getUserRoles.mockResolvedValue([{ roleName: 'ADMIN' }]);
    (globalThis as any)['__UM_PERMISSION_CACHE__']?.clear?.();
  });

  describe('Authentication', () => {
    it('should return 401 when no session exists', async () => {
      mockAuthService.getSession.mockResolvedValue(null);

      const middleware = withPermissionCheck(mockHandler, {
        requiredPermission: Permission.VIEW_TEAM_MEMBERS,
      });

      const response = await middleware(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should return 403 when user has no team membership', async () => {
      mockAuthService.getSession.mockResolvedValue({ user: mockUser } as any);
      vi.mocked(prisma.users.findUnique).mockResolvedValue({ 
        id: mockUser.id, 
        email: mockUser.email,
        teamMember: null 
      } as any);

      const middleware = withPermissionCheck(mockHandler, {
        requiredPermission: Permission.VIEW_TEAM_MEMBERS,
      });

      const response = await middleware(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('No role assigned');
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('Permission Checking', () => {
    beforeEach(() => {
      mockAuthService.getSession.mockResolvedValue({ user: mockUser } as any);
      vi.mocked(prisma.users.findUnique).mockResolvedValue({
        id: mockUser.id, 
        email: mockUser.email,
        teamMember: mockTeamMember 
      } as any);
    });

    it('should allow access when user has required permission', async () => {
      mockPermissionService.hasPermission.mockResolvedValue(true); // Use mockPermissionService
      checkRolePermission.mockResolvedValue(true); // Keep this if checkRolePermission is still used internally

      const middleware = withPermissionCheck(mockHandler, {
        requiredPermission: Permission.VIEW_TEAM_MEMBERS,
      });

      await middleware(mockRequest);

      expect(mockHandler).toHaveBeenCalled();
    });

    it('should deny access when user lacks required permission', async () => {
      mockPermissionService.hasPermission.mockResolvedValue(false); // Use mockPermissionService
      checkRolePermission.mockResolvedValue(false); // Keep this if checkRolePermission is still used internally

      const middleware = withPermissionCheck(mockHandler, {
        requiredPermission: Permission.MANAGE_BILLING,
      });

      const response = await middleware(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Insufficient permissions');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should use cached permission check results', async () => {
      mockAuthService.getSession.mockResolvedValue({ user: { id: '1' } });
      mockPermissionService.hasPermission.mockResolvedValue(true);
      checkRolePermission.mockResolvedValue(true); // Keep this if checkRolePermission is still used internally

      const middleware = withPermissionCheck(mockHandler, {
        requiredPermission: Permission.VIEW_TEAM_MEMBERS,
      });
      
      // First call should check permissions
      await middleware(mockRequest);
      expect(mockPermissionService.hasPermission).toHaveBeenCalledTimes(1);
      // If checkRolePermission is called internally by hasPermission, it might be called too.
      // If not, remove this expectation.
      // expect(checkRolePermission).toHaveBeenCalledTimes(1); 

      // Second call should use cache
      await middleware(mockRequest);
      expect(mockPermissionService.hasPermission).toHaveBeenCalledTimes(1); // Should still be 1 due to caching
      // If checkRolePermission is called internally by hasPermission, it might be called too.
      // If not, remove this expectation.
      // expect(checkRolePermission).toHaveBeenCalledTimes(1); 
    });
  });

  describe('Resource Access', () => {
    beforeEach(() => {
      mockAuthService.getSession.mockResolvedValue({ user: mockUser } as any);
      vi.mocked(prisma.users.findUnique).mockResolvedValue({
        id: mockUser.id, 
        email: mockUser.email,
        teamMember: mockTeamMember 
      } as any);
      mockPermissionService.hasPermission.mockResolvedValue(true); // Assume general permission is granted
      checkRolePermission.mockResolvedValue(true); // Assume general permission is granted
    });

    it('should allow access to own team resources', async () => {
      vi.mocked(prisma.team_members.findUnique).mockResolvedValue({ 
        teamId: 'team-1' 
      } as any);
      
      const middleware = withPermissionCheck(mockHandler, {
        requiredPermission: Permission.VIEW_TEAM_MEMBERS,
        resourceId: 'team-1',
      });

      await middleware(mockRequest);

      expect(mockHandler).toHaveBeenCalled();
    });

    it('should deny access to other team resources', async () => {
      vi.mocked(prisma.team_members.findUnique).mockResolvedValue({ 
        teamId: 'team-1' // User is a member of team-1
      } as any);
      
      const middleware = withPermissionCheck(mockHandler, {
        requiredPermission: Permission.VIEW_TEAM_MEMBERS,
        resourceId: 'team-2', // Trying to access team-2
      });

      const response = await middleware(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Resource access denied');
    });

    it('should check project resource access', async () => {
      vi.mocked(prisma.team_members.findUnique).mockResolvedValue({ 
        teamId: 'team-1' 
      } as any);
      
      const middleware = withPermissionCheck(mockHandler, {
        requiredPermission: Permission.VIEW_PROJECTS,
        resourceId: 'project-1',
      });

      await middleware(mockRequest);

      expect(mockHandler).toHaveBeenCalled();
    });

    it('should check organization resource access', async () => {
      vi.mocked(prisma.team_members.findUnique).mockResolvedValue({ 
        teamId: 'team-1' 
      } as any);
      
      const middleware = withPermissionCheck(mockHandler, {
        requiredPermission: Permission.MANAGE_ORG_SETTINGS,
        resourceId: 'org-1',
      });

      await middleware(mockRequest);

      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle internal errors gracefully', async () => {
      mockAuthService.getSession.mockRejectedValue(new Error('Database error'));

      const middleware = withPermissionCheck(mockHandler, {
        requiredPermission: Permission.VIEW_TEAM_MEMBERS,
      });

      const response = await middleware(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
  expect(data.error).toBe('Internal server error');
    });
  });
});
