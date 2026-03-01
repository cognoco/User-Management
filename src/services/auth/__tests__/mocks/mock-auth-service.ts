// src/services/auth/__tests__/mocks/mock-auth-service.ts
import { vi } from 'vitest';
import { AuthService, AuthState, RequestContext, MfaCheckParams, MfaCheckResult, MfaVerifyParams, MfaVerifyResult, MfaResendResult } from '../../../../core/auth/interfaces';
import { 
  AuthResult, 
  LoginPayload, 
  MFASetupResponse, 
  MFAVerifyResponse, 
  RegistrationPayload, 
  User 
} from '../../../../core/auth/models';
import type { OAuthProvider, OAuthUserProfile, OAuthProviderConfig } from '@/types/oauth';

/**
 * Mock implementation of the AuthService interface for testing
 */
export class MockAuthService implements AuthService {
  private authStateListeners: ((user: User | null) => void)[] = [];
  private mockUser: User | null = null;
  private mockAuthState: AuthState = {
    user: null,
    token: null,
    isLoading: false,
    isAuthenticated: false,
    error: null,
    successMessage: null,
    mfaEnabled: false
  };
  private expiry: number | null = null;

  // Mock implementations with Vitest spies
  login = vi.fn().mockImplementation(async (credentials: LoginPayload, _context?: RequestContext): Promise<AuthResult> => {
    const result: AuthResult = { success: true };
    this.mockUser = { 
      id: 'mock-user-id', 
      email: credentials.email,
      firstName: 'Mock',
      lastName: 'User',
    };
    this.mockAuthState = {
      ...this.mockAuthState,
      user: this.mockUser,
      isAuthenticated: true,
      token: 'mock-token'
    };
    this.notifyListeners(this.mockUser);
    return result;
  });

  register = vi.fn().mockImplementation(async (userData: RegistrationPayload, _context?: RequestContext): Promise<AuthResult> => {
    const result: AuthResult = { success: true };
    this.mockUser = { 
      id: 'mock-user-id', 
      email: userData.email,
      firstName: userData.firstName || 'New',
      lastName: userData.lastName || 'User',
    };
    this.mockAuthState = {
      ...this.mockAuthState,
      user: this.mockUser,
      isAuthenticated: true,
      token: 'mock-token'
    };
    this.notifyListeners(this.mockUser);
    return result;
  });

  logout = vi.fn().mockImplementation(async (_context?: RequestContext): Promise<void> => {
    this.mockUser = null;
    this.mockAuthState = {
      ...this.mockAuthState,
      user: null,
      isAuthenticated: false,
      token: null
    };
    this.notifyListeners(null);
  });

  getCurrentUser = vi.fn().mockImplementation(async (): Promise<User | null> => {
    return this.mockUser;
  });

  isAuthenticated = vi.fn().mockImplementation((): boolean => {
    return this.mockAuthState.isAuthenticated;
  });

  resetPassword = vi.fn().mockImplementation(async (_email: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    return { success: true, message: 'Password reset email sent' };
  });

  updatePassword = vi.fn().mockImplementation(async (_oldPassword: string, _newPassword: string): Promise<void> => {
    // Implementation not needed for most tests
  });

  verifyPasswordResetToken = vi.fn().mockImplementation(async (_token: string): Promise<{ valid: boolean; error?: string }> => {
    return { valid: true };
  });

  updatePasswordWithToken = vi.fn().mockImplementation(async (_token: string, _newPassword: string): Promise<AuthResult> => {
    return { success: true };
  });

  sendVerificationEmail = vi.fn().mockImplementation(async (_email: string): Promise<AuthResult> => {
    return { success: true };
  });

  sendMagicLink = vi.fn().mockImplementation(async (_email: string): Promise<{ success: boolean; error?: string }> => {
    return { success: true };
  });

  verifyEmail = vi.fn().mockImplementation(async (_token: string): Promise<void> => {
    // No emailVerified field on User; MFA status tracked separately
  });

  verifyMagicLink = vi.fn().mockImplementation(async (_token: string): Promise<AuthResult> => {
    return { success: true };
  });

  deleteAccount = vi.fn().mockImplementation(async (_passwordOrParams?: string | { userId: string; password: string }): Promise<{ success: boolean; error?: string }> => {
    this.mockUser = null;
    this.mockAuthState = {
      ...this.mockAuthState,
      user: null,
      isAuthenticated: false,
      token: null
    };
    this.notifyListeners(null);
    return { success: true };
  });

  getUserAccount = vi.fn().mockImplementation(async (_userId: string): Promise<any> => {
    return this.mockUser;
  });

  setupMFA = vi.fn().mockImplementation(async (): Promise<MFASetupResponse> => {
    return { 
      success: true,
      secret: 'mock-mfa-secret', 
      qrCode: 'data:image/png;base64,mockQrCodeData' 
    };
  });

  verifyMFA = vi.fn().mockImplementation(async (_code: string, _context?: RequestContext): Promise<MFAVerifyResponse> => {
    this.mockAuthState = {
      ...this.mockAuthState,
      mfaEnabled: true
    };
    return { success: true, token: 'mock-mfa-token' };
  });

  disableMFA = vi.fn().mockImplementation(async (_code: string): Promise<AuthResult> => {
    this.mockAuthState = {
      ...this.mockAuthState,
      mfaEnabled: false
    };
    return { success: true };
  });

  checkMfaRequirements = vi.fn().mockImplementation(async (_params: MfaCheckParams): Promise<MfaCheckResult> => {
    return { success: true, mfaRequired: false };
  });

  verifyMfaCode = vi.fn().mockImplementation(async (_params: MfaVerifyParams): Promise<MfaVerifyResult> => {
    return { success: true };
  });

  resendMfaEmailCode = vi.fn().mockImplementation(async (_accessToken: string): Promise<MfaResendResult> => {
    return { success: true };
  });

  resendMfaSmsCode = vi.fn().mockImplementation(async (_accessToken: string): Promise<MfaResendResult> => {
    return { success: true };
  });

  configureOAuthProvider = vi.fn().mockImplementation((_config: OAuthProviderConfig): void => {
    // no-op for tests
  });

  getOAuthAuthorizationUrl = vi.fn().mockImplementation((_provider: OAuthProvider, _state?: string): string => {
    return 'https://mock-oauth.example.com/authorize';
  });

  exchangeOAuthCode = vi.fn().mockImplementation(async (_provider: OAuthProvider, _code: string): Promise<OAuthUserProfile> => {
    return { id: 'mock-oauth-id', email: 'oauth@example.com', provider: 'google' as OAuthProvider, accessToken: 'mock-oauth-token' };
  });

  refreshToken = vi.fn().mockImplementation(async (): Promise<boolean> => {
    this.expiry = Date.now() + 60_000;
    return true;
  });

  getTokenExpiry = vi.fn().mockImplementation((): number | null => this.expiry);

  handleSessionTimeout = vi.fn().mockImplementation((): void => {
    this.logout();
  });

  onAuthStateChanged = vi.fn().mockImplementation((callback: (user: User | null) => void): (() => void) => {
    this.authStateListeners.push(callback);
    // Call immediately with current state
    callback(this.mockUser);
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index !== -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  });

  // Helper methods for testing
  private notifyListeners(user: User | null): void {
    this.authStateListeners.forEach(listener => listener(user));
  }

  // Methods to control mock behavior in tests
  setMockUser(user: User | null): void {
    this.mockUser = user;
    this.mockAuthState = {
      ...this.mockAuthState,
      user,
      isAuthenticated: !!user,
      token: user ? 'mock-token' : null
    };
    this.notifyListeners(user);
  }

  setMockAuthState(state: Partial<AuthState>): void {
    this.mockAuthState = {
      ...this.mockAuthState,
      ...state
    };
    this.notifyListeners(this.mockAuthState.user);
  }

  getMockAuthState(): AuthState {
    return this.mockAuthState;
  }
}
