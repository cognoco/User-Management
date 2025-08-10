import { AuthDataProvider } from '../interfaces';
import {
  AuthResult,
  LoginPayload,
  RegistrationPayload,
  User,
  MFASetupResponse,
  MFAVerifyResponse,
} from '@/core/auth/models';

export class MockAuthAdapter implements AuthDataProvider {
  private currentUser: User | null = null;
  private users: Map<string, User & { password: string }> = new Map();
  private resetTokens: Map<string, { userId: string; expires: number }> = new Map();
  private refreshTokens: Map<string, { userId: string; expires: number }> = new Map();

  constructor() {
    // Set up default mock user
    const defaultUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
      mfaEnabled: false,
      password: 'hashedPassword123',
    };
    this.users.set(defaultUser.email, defaultUser);
    this.currentUser = {
      id: defaultUser.id,
      email: defaultUser.email,
      name: defaultUser.name,
      emailVerified: defaultUser.emailVerified,
      mfaEnabled: defaultUser.mfaEnabled,
    };
  }

  async login(credentials: LoginPayload): Promise<AuthResult> {
    const user = this.users.get(credentials.email);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Mock password verification
    if (credentials.password !== 'Password1!') {
      return { success: false, error: 'Invalid credentials' };
    }

    this.currentUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
    };

    return {
      success: true,
      user: this.currentUser,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    };
  }

  async register(userData: RegistrationPayload): Promise<AuthResult> {
    if (this.users.has(userData.email)) {
      return { success: false, error: 'User already exists' };
    }

    const user = {
      id: `user-${Date.now()}`,
      email: userData.email,
      name: userData.name || userData.email,
      emailVerified: false,
      mfaEnabled: false,
      password: 'hashedPassword',
    };

    this.users.set(userData.email, user);
    this.currentUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
    };

    return {
      success: true,
      user: this.currentUser,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    };
  }

  async logout(): Promise<void> {
    this.currentUser = null;
  }

  async getCurrentUser(): Promise<User | null> {
    return this.currentUser;
  }

  async resetPassword(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const user = Array.from(this.users.values()).find(u => u.email === email);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const token = `reset-token-${Date.now()}`;
    this.resetTokens.set(token, {
      userId: user.id,
      expires: Date.now() + 3600000, // 1 hour
    });

    return { success: true, message: 'Reset email sent' };
  }

  async updatePassword(oldPassword: string, newPassword: string): Promise<void> {
    if (!this.currentUser) {
      throw new Error('Not authenticated');
    }
    // Mock implementation - in real implementation would verify old password
  }

  async verifyPasswordResetToken(token: string): Promise<{ valid: boolean; user?: User; token?: string; error?: string }> {
    const tokenData = this.resetTokens.get(token);
    if (!tokenData || tokenData.expires < Date.now()) {
      return { valid: false, error: 'Invalid or expired token' };
    }

    const user = Array.from(this.users.values()).find(u => u.id === tokenData.userId);
    if (!user) {
      return { valid: false, error: 'User not found' };
    }

    return {
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
      },
      token,
    };
  }

  async updatePasswordWithToken(token: string, newPassword: string): Promise<AuthResult> {
    const verification = await this.verifyPasswordResetToken(token);
    if (!verification.valid || !verification.user) {
      return { success: false, error: verification.error || 'Invalid token' };
    }

    const user = Array.from(this.users.values()).find(u => u.id === verification.user!.id);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    user.password = 'newHashedPassword';
    this.resetTokens.delete(token);

    return {
      success: true,
      user: verification.user,
    };
  }

  async invalidateSessions(userId: string): Promise<void> {
    // Mock implementation
  }

  async sendVerificationEmail(email: string): Promise<AuthResult> {
    return { success: true };
  }

  async sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  async verifyEmail(token: string): Promise<void> {
    // Mock implementation
  }

  async verifyMagicLink(token: string): Promise<AuthResult> {
    // Mock implementation - return success with mock user
    return {
      success: true,
      user: this.currentUser || {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        mfaEnabled: false,
      },
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    };
  }

  async deleteAccount(password?: string): Promise<void> {
    if (this.currentUser) {
      this.users.delete(this.currentUser.email);
      this.currentUser = null;
    }
  }

  async setupMFA(): Promise<MFASetupResponse> {
    return {
      secret: 'mock-secret',
      qrCode: 'data:image/png;base64,mock-qr-code',
      backupCodes: ['123456', '789012'],
    };
  }

  async verifyMFA(code: string): Promise<MFAVerifyResponse> {
    return { success: true, token: 'mock-mfa-token' };
  }

  async disableMFA(code: string): Promise<AuthResult> {
    return { success: true };
  }

  async startWebAuthnRegistration(): Promise<MFASetupResponse> {
    return {
      challenge: 'mock-challenge',
      options: {},
    };
  }

  async verifyWebAuthnRegistration(data: unknown): Promise<MFAVerifyResponse> {
    return { success: true, token: 'mock-webauthn-token' };
  }

  async refreshToken(): Promise<{ accessToken: string; refreshToken: string; expiresAt: number } | null> {
    if (!this.currentUser) return null;
    
    return {
      accessToken: 'new-mock-access-token',
      refreshToken: 'new-mock-refresh-token',
      expiresAt: Date.now() + 3600000,
    };
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    // Mock implementation - return no-op unsubscribe function
    return () => {};
  }

  handleSessionTimeout(): void {
    this.currentUser = null;
  }

  // Helper methods for testing
  setMockUser(user: User) {
    this.currentUser = user;
  }

  clearMockData() {
    this.users.clear();
    this.resetTokens.clear();
    this.refreshTokens.clear();
    this.currentUser = null;
  }
}