/**
 * Default Authentication Service Implementation
 *
 * Provides business logic around the {@link AuthDataProvider} while exposing
 * the {@link AuthService} interface used throughout the application.
 */
import { AuthService, RequestContext } from '@/core/auth/interfaces';
import type { AuthDataProvider } from '@/adapters/auth/interfaces';
import {
  AuthResult,
  LoginPayload,
  RegistrationPayload,
  MFASetupResponse,
  MFAVerifyResponse,
  User,
  loginSchema,
  registerSchema
} from '@/core/auth/models';
import { AuthEventType } from '@/core/auth/events';
import { translateError } from '@/lib/utils/error';
import { handleServiceError } from '@/services/common/service-error-handler';
import { ERROR_CODES } from '@/core/common/error-codes';
import {
  InvalidRefreshTokenError,
  TokenRefreshError,
  isInvalidRefreshTokenError,
  isTokenRefreshError,
} from '@/core/common/errors';
import { TypedEventEmitter } from '@/lib/utils/typed-event-emitter';
import type {
  OAuthProvider,
  OAuthProviderConfig,
  OAuthUserProfile,
} from '@/types/oauth';
import type { OAuthDataProvider } from '@/adapters/auth/providers/oauth-provider';
import type { AuthStorage } from './auth-storage';
import { BrowserAuthStorage } from './auth-storage';
import { DefaultSessionTracker, type SessionTracker } from './session-tracker';
import { DefaultMFAHandler, type MFAHandler } from './mfa-handler';
import { logUserAction } from '@/lib/audit/auditLogger';
// Import only the plain config (no TSX) to avoid pulling client code into server bundles
import { authConfig } from '@/lib/config';
import { withRetry } from '@/lib/utils/retry';
import { isNetworkError } from '@/lib/utils/error';
import { associateUserWithCompanyByDomain } from '@/lib/auth/domainMatcher';

/** Keys used for persisting auth data */
const TOKEN_KEY = 'auth_token';
const LAST_ACTIVITY_KEY = 'last_activity';

export class DefaultAuthService
  extends TypedEventEmitter<AuthEventType>
  implements AuthService {
  private user: User | null = null;
  private token: string | null = null;
  private tokenExpiry: number | null = null;

  private readonly sessionTracker: SessionTracker;
  private readonly mfaHandler: MFAHandler;

  constructor(
    private readonly provider: AuthDataProvider,
    private readonly storage: AuthStorage = new BrowserAuthStorage(),
  ) {
    super();
    this.sessionTracker = new DefaultSessionTracker({
      refreshToken: () => this.refreshToken(),
      onSessionTimeout: () => this.handleSessionTimeout(),
    });
    this.mfaHandler = new DefaultMFAHandler(provider);

    // Sync with underlying provider state
    this.provider.onAuthStateChanged(user => {
      this.user = user;
      if (!user) {
        this.token = null;
      }
    });

    // Restore persisted token if available
    const storedToken = this.storage.getItem(TOKEN_KEY);
    if (storedToken) {
      this.token = storedToken;
      this.tokenExpiry = Date.now() + authConfig.tokenExpiryDays * 24 * 60 * 60 * 1000;
      this.sessionTracker.initializeSessionCheck();
      this.sessionTracker.initializeTokenRefresh(
        Date.now() + authConfig.tokenExpiryDays * 24 * 60 * 60 * 1000,
      );
    }
  }

  private persistToken(token: string | null, expiresAt?: number): void {
    this.token = token;
    this.tokenExpiry = expiresAt ?? null;
    if (token) {
      this.storage.setItem(TOKEN_KEY, token);
      this.sessionTracker.updateLastActivity();
      if (expiresAt) {
        this.sessionTracker.initializeTokenRefresh(expiresAt);
      }
    } else {
      this.storage.removeItem(TOKEN_KEY);
      this.storage.removeItem(LAST_ACTIVITY_KEY);
      this.tokenExpiry = null;
    }
  }

  private isOAuthProvider(provider: AuthDataProvider): provider is OAuthDataProvider {
    return (
      typeof (provider as OAuthDataProvider).getAuthorizationUrl === 'function' &&
      typeof (provider as OAuthDataProvider).exchangeCode === 'function'
    );
  }

  private async logAction(params: Parameters<typeof logUserAction>[0]): Promise<void> {
    try {
      await logUserAction(params);
    } catch {
      // logging should never block auth flow
    }
  }

  async login(credentials: LoginPayload): Promise<AuthResult>;
  async login(credentials: LoginPayload, context?: RequestContext): Promise<AuthResult> {
    const parsed = loginSchema.safeParse(credentials);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || 'Invalid credentials';
      await this.logAction({ 
        action: 'LOGIN', 
        status: 'FAILURE', 
        details: { error: message },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent
      });
      return { success: false, error: message };
    }

    try {
      const result = await withRetry(
        () => this.provider.login(credentials),
        { retries: 1, isRetryable: isNetworkError },
      );
      
      if (result.success) {
        this.user = result.user ?? null;
        this.persistToken(
          result.token ?? null,
          Date.now() + authConfig.tokenExpiryDays * 24 * 60 * 60 * 1000,
        );
        
        // Set expiration time in result
        result.expiresAt = Date.now() + authConfig.tokenExpiryDays * 24 * 60 * 60 * 1000;
        
        this.emit({
          type: 'user_logged_in',
          timestamp: Date.now(),
          user: this.user!,
          remembered: credentials.rememberMe ?? false,
        });
        
        await this.logAction({
          userId: this.user?.id,
          action: 'LOGIN',
          status: 'SUCCESS',
          targetResourceType: 'user',
          targetResourceId: this.user?.id,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent
        });
        
        // Check if user has MFA enabled and include in result
        if (this.user) {
          result.requiresMfa = this.user.mfaEnabled ?? false;
        }
      } else {
        this.user = null;
        this.persistToken(null);
        await this.logAction({ 
          action: 'LOGIN', 
          status: 'FAILURE', 
          details: { error: result.error },
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent
        });
        
        // Handle specific error types for better API response classification
        if (result.error?.includes('Invalid login credentials')) {
          result.code = 'INVALID_CREDENTIALS';
        } else if (result.error?.includes('Email not confirmed')) {
          result.code = 'EMAIL_NOT_VERIFIED';
        }
      }
      return result;
    } catch (error) {
      const message = translateError(error, { defaultMessage: 'Login failed' });
      this.user = null;
      this.persistToken(null);
      await this.logAction({ 
        action: 'LOGIN', 
        status: 'FAILURE', 
        details: { error: message },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent
      });
      this.emit({
        type: 'authentication_failed',
        timestamp: Date.now(),
        email: credentials.email,
        reason: 'other',
        error: message,
      });
      
      // Handle rate limiting errors
      if ((error as any)?.response?.status === 429) {
        const retryAfter = parseInt((error as any).response.headers['retry-after'] || '900', 10) * 1000;
        return { 
          success: false, 
          error: message, 
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter,
          remainingAttempts: parseInt((error as any).response.headers['x-ratelimit-remaining'] || '0', 10)
        };
      }
      
      return { success: false, error: message };
    }
  }

  async register(userData: RegistrationPayload): Promise<AuthResult>;
  async register(userData: RegistrationPayload, context?: RequestContext): Promise<AuthResult> {
    const parsed = registerSchema.safeParse(userData);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || 'Invalid data';
      await this.logAction({ 
        action: 'REGISTER', 
        status: 'FAILURE', 
        details: { error: message },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent
      });
      return { success: false, error: message };
    }

    try {
      const result = await withRetry(
        () => this.provider.register(userData),
        { retries: 1, isRetryable: isNetworkError },
      );
      
      if (result.success) {
        this.emit({
          type: 'user_registered',
          timestamp: Date.now(),
          user: result.user!,
          requiresEmailVerification: result.code === 'EMAIL_NOT_VERIFIED',
        });
        
        await this.logAction({
          userId: result.user?.id,
          action: 'REGISTER',
          status: 'SUCCESS',
          targetResourceType: 'user',
          targetResourceId: result.user?.id,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent
        });
        
        // Handle company domain association if user was created successfully
        if (result.user?.email) {
          try {
            await associateUserWithCompanyByDomain(result.user.id, result.user.email);
          } catch (error) {
            console.warn('Failed to associate user with company by domain:', error);
            // Non-critical error, continue with registration success
          }
        }
        
        // Handle specific error types for better API response classification
        if (result.code === 'EMAIL_NOT_VERIFIED') {
          result.requiresEmailConfirmation = true;
        }
      } else {
        await this.logAction({ 
          action: 'REGISTER', 
          status: 'FAILURE', 
          details: { error: result.error },
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent
        });
        
        // Handle specific error types for better API response classification
        if (result.error?.includes('already exists')) {
          // This allows API routes to handle this specific error type
        }
      }
      return result;
    } catch (error) {
      const message = translateError(error, { defaultMessage: 'Registration failed' });
      await this.logAction({ 
        action: 'REGISTER', 
        status: 'FAILURE', 
        details: { error: message },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent
      });
      return { success: false, error: message };
    }
  }

  async logout(): Promise<void>;
  async logout(context?: RequestContext): Promise<void> {
    const currentUser = this.user;
    try {
      await this.provider.logout();
    } catch (error) {
      // log but proceed with cleanup
      console.error('Logout error', error);
    }

    this.sessionTracker.cleanup();
    this.user = null;
    this.persistToken(null);

    this.emit({
      type: 'user_logged_out',
      timestamp: Date.now(),
      userId: currentUser?.id ?? '',
      sessionExpired: false,
    });

    await this.logAction({
      userId: currentUser?.id,
      action: 'LOGOUT',
      status: 'SUCCESS',
      targetResourceType: 'user',
      targetResourceId: currentUser?.id,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent
    });
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.user) return this.user;
    try {
      this.user = await withRetry(
        () => this.provider.getCurrentUser(),
        { retries: 1, isRetryable: isNetworkError },
      );
      return this.user;
    } catch (error) {
      const { error: err } = handleServiceError(error, {
        service: 'DefaultAuthService',
        method: 'getCurrentUser',
        resourceType: 'user',
        resourceId: 'current',
      }, ERROR_CODES.INTERNAL_ERROR);
      throw err;
    }
  }

  isAuthenticated(): boolean {
    return this.user !== null;
  }

  async resetPassword(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const result = await this.provider.resetPassword(email);
      if (result.success) {
        this.emit({ type: 'password_reset_requested', timestamp: Date.now(), email });
        await this.logAction({ action: 'PASSWORD_RESET_REQUEST', status: 'SUCCESS', targetResourceType: 'user', details: { email } });
      }
      return result;
    } catch (error) {
      const message = translateError(error, { defaultMessage: 'Password reset failed' });
      await this.logAction({ action: 'PASSWORD_RESET_REQUEST', status: 'FAILURE', details: { error: message } });
      return { success: false, error: message };
    }
  }

  async updatePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      await this.provider.updatePassword(oldPassword, newPassword);
      if (this.user?.id) {
        await this.provider.invalidateSessions(this.user.id);
      }
      this.emit({ type: 'password_updated', timestamp: Date.now(), userId: this.user?.id ?? '' });
      await this.logAction({ userId: this.user?.id, action: 'PASSWORD_UPDATE', status: 'SUCCESS', targetResourceType: 'user', targetResourceId: this.user?.id });
    } catch (error) {
      const message = translateError(error, { defaultMessage: 'Password update failed' });
      await this.logAction({ userId: this.user?.id, action: 'PASSWORD_UPDATE', status: 'FAILURE', details: { error: message } });
      throw new Error(message);
    }
  }

  async verifyPasswordResetToken(token: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const result = await this.provider.verifyPasswordResetToken(token);
      if (result.valid && result.user) {
        this.user = result.user;
        if (result.token) this.persistToken(result.token);
      }
      return { valid: result.valid, error: result.error };
    } catch (error) {
      const message = translateError(error, { defaultMessage: 'Invalid reset token' });
      return { valid: false, error: message };
    }
  }

  async updatePasswordWithToken(token: string, newPassword: string): Promise<AuthResult> {
    try {
      const res = await this.provider.updatePasswordWithToken(token, newPassword);
      if (res.success) {
        if (res.user) this.user = res.user;
        if (res.token) this.persistToken(res.token);
        if (res.user?.id) {
          await this.provider.invalidateSessions(res.user.id);
        }
        this.emit({ type: 'password_reset_completed', timestamp: Date.now(), userId: res.user?.id ?? '' });
      }
      return res;
    } catch (error) {
      const message = translateError(error, { defaultMessage: 'Password update failed' });
      await this.logAction({ action: 'PASSWORD_RESET_COMPLETED', status: 'FAILURE', details: { error: message } });
      return { success: false, error: message };
    }
  }

  async sendVerificationEmail(email: string): Promise<AuthResult> {
    try {
      const result = await this.provider.sendVerificationEmail(email);
      if (result.success) {
        this.emit({ type: 'email_verified', timestamp: Date.now(), userId: this.user?.id ?? '', email });
      }
      return result;
    } catch (error) {
      const message = translateError(error, { defaultMessage: 'Failed to send verification email' });
      return { success: false, error: message };
    }
  }

  async sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.provider.sendMagicLink(email);
    } catch (error) {
      const message = translateError(error, { defaultMessage: 'Failed to send magic link' });
      return { success: false, error: message };
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      await this.provider.verifyEmail(token);
      this.emit({ type: 'email_verified', timestamp: Date.now(), userId: this.user?.id ?? '', email: this.user?.email ?? '' });
    } catch (error) {
      const message = translateError(error, { defaultMessage: 'Email verification failed' });
      throw new Error(message);
    }
  }

  async verifyMagicLink(token: string): Promise<AuthResult> {
    try {
      const result = await this.provider.verifyMagicLink(token);
      if (result.success) {
        this.user = result.user ?? null;
        this.persistToken(result.token ?? null, result.expiresAt);
      }
      return result;
    } catch (error) {
      const message = translateError(error, { defaultMessage: 'Magic link verification failed' });
      return { success: false, error: message };
    }
  }

  async deleteAccount(password?: string): Promise<void> {
    const id = this.user?.id;
    try {
      await this.provider.deleteAccount(password);
      this.sessionTracker.cleanup();
      this.persistToken(null);
      this.user = null;
      this.emit({ type: 'account_deleted', timestamp: Date.now(), userId: id ?? '' });
      await this.logAction({ userId: id, action: 'ACCOUNT_DELETION', status: 'SUCCESS', targetResourceType: 'user', targetResourceId: id });
    } catch (error) {
      const message = translateError(error, { defaultMessage: 'Account deletion failed' });
      await this.logAction({ userId: id, action: 'ACCOUNT_DELETION', status: 'FAILURE', details: { error: message } });
      throw new Error(message);
    }
  }

  async setupMFA(): Promise<MFASetupResponse> {
    try {
      const res = await this.mfaHandler.setupMFA();
      if (res.success) {
        this.emit({ type: 'mfa_enabled', timestamp: Date.now(), userId: this.user?.id ?? '' });
      }
      return res;
    } catch (error) {
      const message = translateError(error, { defaultMessage: 'MFA setup failed' });
      return { success: false, error: message };
    }
  }

  async verifyMFA(code: string): Promise<MFAVerifyResponse>;
  async verifyMFA(code: string, context?: RequestContext): Promise<MFAVerifyResponse> {
    const result = await this.mfaHandler.verifyMFA(code);
    
    // Log the MFA verification attempt
    await this.logAction({
      userId: this.user?.id,
      action: 'MFA_VERIFY',
      status: result.success ? 'SUCCESS' : 'FAILURE',
      targetResourceType: 'auth',
      targetResourceId: this.user?.id,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent
    });
    
    return result;
  }

  async disableMFA(code: string): Promise<AuthResult> {
    try {
      const res = await this.mfaHandler.disableMFA(code);
      if (res.success) {
        this.emit({ type: 'mfa_disabled', timestamp: Date.now(), userId: this.user?.id ?? '' });
      }
      return res;
    } catch (error) {
      const message = translateError(error, { defaultMessage: 'Failed to disable MFA' });
      return { success: false, error: message };
    }
  }

  configureOAuthProvider(config: OAuthProviderConfig): void {
    if (!this.isOAuthProvider(this.provider)) {
      throw new Error('OAuth operations are not supported by the configured provider');
    }
    this.provider.configureProvider(config);
  }

  getOAuthAuthorizationUrl(provider: OAuthProvider, state?: string): string {
    if (!this.isOAuthProvider(this.provider)) {
      throw new Error('OAuth operations are not supported by the configured provider');
    }
    try {
      return this.provider.getAuthorizationUrl(provider, state);
    } catch (error) {
      const message = translateError(error, { defaultMessage: 'Failed to build authorization URL' });
      throw new Error(message);
    }
  }

  async exchangeOAuthCode(provider: OAuthProvider, code: string): Promise<OAuthUserProfile> {
    if (!this.isOAuthProvider(this.provider)) {
      throw new Error('OAuth operations are not supported by the configured provider');
    }
    try {
      const tokens = await this.provider.exchangeCode(provider, code);
      const profile = await this.provider.fetchUserProfile(provider, tokens.accessToken);
      this.provider.setProviderMetadata(provider, tokens);
      return profile;
    } catch (error) {
      const message = translateError(error, { defaultMessage: 'OAuth code exchange failed' });
      throw new Error(message);
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      const res = await this.provider.refreshToken();
      if (res) {
        this.sessionTracker.updateLastActivity();
        this.persistToken(res.accessToken, res.expiresAt);
        return true;
      }
      this.handleSessionTimeout();
      return false;
    } catch (error) {
      if (isTokenRefreshError(error)) {
        // silent retry once on transient failures
        try {
          const retry = await this.provider.refreshToken();
          if (retry) {
            this.sessionTracker.updateLastActivity();
            this.persistToken(retry.accessToken, retry.expiresAt);
            return true;
          }
        } catch {}
        this.emit({
          type: 'auth_state_recovery_failed',
          timestamp: Date.now(),
          reason: 'network',
        });
      } else if (isInvalidRefreshTokenError(error)) {
        if (this.user?.id) {
          await this.provider.invalidateSessions(this.user.id);
        }
        this.emit({
          type: 'auth_state_recovery_failed',
          timestamp: Date.now(),
          reason: 'invalid_refresh',
        });
      } else {
        this.emit({
          type: 'auth_state_recovery_failed',
          timestamp: Date.now(),
          reason: 'unknown',
        });
      }
      this.handleSessionTimeout();
      return false;
    }
  }

  getTokenExpiry(): number | null {
    return this.tokenExpiry;
  }

  handleSessionTimeout(): void {
    const id = this.user?.id;
    this.provider.handleSessionTimeout();
    this.sessionTracker.cleanup();
    this.user = null;
    this.persistToken(null);
    this.emit({ type: 'user_logged_out', timestamp: Date.now(), userId: id ?? '', sessionExpired: true });
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return this.on(event => {
      if (event.type === 'user_logged_in' || event.type === 'user_logged_out') {
        callback(this.user);
      }
    });
  }
}
