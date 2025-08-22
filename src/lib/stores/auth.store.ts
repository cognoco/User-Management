/**
 * @deprecated This store is being migrated to the new hooks-based architecture.
 * Please use the useAuth hook from @/hooks/auth/useAuth instead.
 * This file exists as a compatibility layer during the migration process.
 */

import { useAuth } from '@/hooks/auth/useAuth';
import { LoginPayload, RegistrationPayload, User, AuthResult } from '@/core/common/user-types';

console.log('[DEPRECATED] auth.store.ts is being used. Please migrate to useAuth hook from @/hooks/auth/useAuth');

// Create a compatibility layer that redirects to the new useAuth hook
export const useAuthStore = () => {
  // Get the new auth hook
  const auth = useAuth();
  
  return {
    // Map the new hook properties to the old store interface
    user: auth.user,
    token: auth.token,
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    error: auth.error,
    successMessage: auth.successMessage,
    rateLimitInfo: auth.rateLimitInfo,
    mfaEnabled: auth.mfaEnabled || false,
    mfaSecret: auth.mfaSecret,
    mfaQrCode: auth.mfaQrCode,
    mfaBackupCodes: auth.mfaBackupCodes,

    setLoading: (isLoading: boolean) => auth.setLoading(isLoading),

    handleSessionTimeout: () => auth.handleSessionTimeout(),
    
    refreshToken: async () => auth.refreshToken(),

    login: async (data: LoginPayload): Promise<AuthResult> => {
      console.log('[DEPRECATED] Using auth.store login - please migrate to useAuth');
      return auth.login(data);
    },

    logout: async () => {
      console.log('[DEPRECATED] Using auth.store logout - please migrate to useAuth');
      return auth.logout();
    },

    register: async (data: RegistrationPayload): Promise<AuthResult> => {
      console.log('[DEPRECATED] Using auth.store register - please migrate to useAuth');
      return auth.register(data);
    },

    clearError: () => auth.clearError(),
    clearSuccessMessage: () => auth.clearSuccessMessage(),
    setUser: (user: User | null) => auth.setUser(user),
    setToken: (token: string | null) => auth.setToken(token),

    setupMFA: async (): Promise<MFASetupResponse> => {
      console.log('[DEPRECATED] Using auth.store setupMFA - please migrate to useAuth');
      return auth.setupMFA();
    },

    verifyMFA: async (code: string): Promise<MFAVerifyResponse> => {
      console.log('[DEPRECATED] Using auth.store verifyMFA - please migrate to useAuth');
      return auth.verifyMFA(code);
    },

    sendVerificationEmail: async (email: string): Promise<AuthResult> => {
      console.log('[DEPRECATED] Using auth.store sendVerificationEmail - please migrate to useAuth');
      return auth.sendVerificationEmail(email);
    },

    resetPassword: async (email: string): Promise<{ success: boolean; message?: string; error?: string }> => {
      console.log('[DEPRECATED] Using auth.store resetPassword - please migrate to useAuth');
      return auth.resetPassword(email);
    },


    updatePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
      console.log('[DEPRECATED] Using auth.store updatePassword - please migrate to useAuth');
      return auth.updatePassword(oldPassword, newPassword);
    },


    verifyEmail: async (token: string): Promise<void> => {
      console.log('[DEPRECATED] Using auth.store verifyEmail - please migrate to useAuth');
      return auth.verifyEmail(token);
    },


    deleteAccount: async (password?: string): Promise<void> => {
      console.log('[DEPRECATED] Using auth.store deleteAccount - please migrate to useAuth');
      return auth.deleteAccount(password);
    }
    // End of compatibility layer

  };
};
