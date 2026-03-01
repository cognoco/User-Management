import { NextRequest } from 'next/server';
import { GET, PATCH } from '../route';
import { 
  resetServiceContainer, 
  configureServices 
} from '@/lib/config/service-container';
import type { UserService } from '@/core/user/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import { vi } from 'vitest';

// Mock the service error handler to avoid compliance config issues
vi.mock('@/services/common/service-error-handler', () => ({
  logServiceError: vi.fn(),
  handleServiceError: vi.fn(),
  withErrorHandling: vi.fn((fn) => fn),
  safeQuery: vi.fn(),
  validateAndExecute: vi.fn(),
}));

// Mock services
const mockUserService: Partial<UserService> = {
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
};

const mockAuthService: Partial<AuthService> = {
  getCurrentUser: vi.fn(),
  isAuthenticated: vi.fn(),
};

describe('/api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetServiceContainer();
    
    // Configure mock services
    configureServices({
      userService: mockUserService as UserService,
      authService: mockAuthService as AuthService,
    });
  });

  describe('GET', () => {
    it('should return user profile for authenticated user', async () => {
      const mockProfile = {
        id: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      // Mock authenticated user
      (mockAuthService.getCurrentUser as any)?.mockResolvedValue({
        id: '123',
        email: 'john@example.com',
      });
      
      (mockUserService.getUserProfile as any)?.mockResolvedValue(mockProfile);

      const request = new NextRequest('http://localhost:3000/api/profile', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockUserService.getUserProfile).toHaveBeenCalledWith('123');
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockProfile);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/profile');

      const response = await GET(request);
      
      expect(response.status).toBe(401);
    });
  });

  describe('PATCH', () => {
    it('should update user profile for authenticated user', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const mockResult = {
        success: true,
        profile: {
          id: '123',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        },
      };

      // Mock authenticated user
      vi.mocked(mockAuthService.getCurrentUser!).mockResolvedValue({
        id: '123',
        email: 'jane@example.com',
      } as any);
      
      vi.mocked(mockUserService.updateUserProfile!).mockResolvedValue(mockResult as any);

      const request = new NextRequest('http://localhost:3000/api/profile', {
        method: 'PATCH',
        headers: { 
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockUserService.updateUserProfile).toHaveBeenCalledWith('123', updateData);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResult.profile);
    });

    it('should validate request data', async () => {
      const invalidData = {
        firstName: 123, // Should be string
      };

      // Mock authenticated user
      vi.mocked(mockAuthService.getCurrentUser!).mockResolvedValue({
        id: '123',
        email: 'jane@example.com',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/profile', {
        method: 'PATCH',
        headers: { 
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      const response = await PATCH(request);
      
      expect(response.status).toBe(400);
      expect(mockUserService.updateUserProfile).not.toHaveBeenCalled();
    });
  });
});
