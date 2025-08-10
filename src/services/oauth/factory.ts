import { OAuthProvider } from '@/types/oauth';

export interface OAuthService {
  disconnectProvider(provider: OAuthProvider): Promise<{
    success: boolean;
    error?: string;
    status?: number;
  }>;
  
  linkProvider(provider: OAuthProvider, code: string): Promise<{
    success: boolean;
    user?: any;
    linkedProviders?: string[];
    error?: string;
    status?: number;
  }>;
  
  verifyProviderEmail(providerId: OAuthProvider, email: string): Promise<{
    success: boolean;
    error?: string;
    status?: number;
  }>;
}

class ApiOAuthService implements OAuthService {
  async disconnectProvider(provider: OAuthProvider) {
    // Mock implementation for testing
    return { success: true };
  }
  
  async linkProvider(provider: OAuthProvider, code: string) {
    // Mock implementation for testing
    return { success: true, user: { id: '1' }, linkedProviders: ['github'] };
  }
  
  async verifyProviderEmail(providerId: OAuthProvider, email: string) {
    // Mock implementation for testing
    return { success: true };
  }
}

export function getApiOAuthService(): OAuthService {
  return new ApiOAuthService();
}
