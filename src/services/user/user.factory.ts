/**
 * User Service Factory
 * 
 * Factory for creating user service instances
 */

import { AdapterRegistry } from '@/adapters/registry';
import type { IUserDataProvider } from '@/core/users';

// User service interface with methods needed for Stripe integration
export interface UserService {
  updateUser(userId: string, data: any): Promise<any>;
  getUser(userId: string): Promise<any>;
}

// Singleton instance
let userServiceInstance: UserService | null = null;

/**
 * Mock implementation for user service
 * This will be replaced with actual implementation once the service layer is complete
 */
class DefaultUserService implements UserService {
  constructor(private provider?: IUserDataProvider) {}

  async updateUser(userId: string, data: any): Promise<any> {
    console.log('Updating user:', userId, data);
    return {
      id: userId,
      ...data,
    };
  }

  async getUser(userId: string): Promise<any> {
    console.log('Getting user:', userId);
    return {
      id: userId,
      email: 'user@example.com',
      name: 'Test User',
    };
  }
}

/**
 * Get user service instance
 */
export function getUserService(): UserService {
  if (!userServiceInstance) {
    try {
      const provider = AdapterRegistry.getInstance().getAdapter<IUserDataProvider>('users');
      userServiceInstance = new DefaultUserService(provider);
    } catch {
      // If no provider is available, use mock
      userServiceInstance = new DefaultUserService();
    }
  }
  
  return userServiceInstance;
}