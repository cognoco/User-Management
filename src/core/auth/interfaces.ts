/**
 * Authentication Service Interface
 * 
 * This file defines the core interfaces for the authentication domain.
 * Following the interface-first design principle, these interfaces define
 * the contract that any implementation must fulfill.
 */

import {
  AuthResult,
  LoginPayload,
  RegistrationPayload,
  User,
  MFASetupResponse,
  MFAVerifyResponse
} from './models';
import type { OAuthProvider, OAuthUserProfile, OAuthProviderConfig } from '@/types/oauth';
import type { TwoFactorMethod } from '@/types/2fa';

// Request context for API operations
export interface RequestContext {
  /**
   * IP address of the requesting client
   */
  ipAddress?: string;
  
  /**
   * User agent string from the request
   */
  userAgent?: string;
  
  /**
   * Additional headers or metadata
   */
  metadata?: Record<string, string>;
  
  /**
   * Callback URL for redirects
   */
  callbackUrl?: string;
}

// Additional interfaces for MFA operations
export interface MfaCheckParams {
  accessToken: string;
  preferredMethod?: TwoFactorMethod;
}

export interface MfaCheckResult {
  success: boolean;
  mfaRequired: boolean;
  availableMethods?: TwoFactorMethod[];
  selectedMethod?: TwoFactorMethod;
  accessToken?: string;
  user?: User;
  error?: string;
}

export interface MfaVerifyParams {
  code: string;
  method: TwoFactorMethod;
  accessToken: string;
  rememberDevice: boolean;
}

export interface MfaVerifyResult {
  success: boolean;
  user?: User;
  session?: {
    access_token: string;
    expires_at: string;
  };
  error?: string;
}

export interface MfaResendResult {
  success: boolean;
  error?: string;
}

// New interfaces for the additional MFA methods
export interface TwoFactorSetupResult {
  success: boolean;
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
  error?: string;
}

export interface BackupCodeResult {
  success: boolean;
  backupCodes?: string[];
  error?: string;
}

export interface TwoFactorVerifyResult {
  success: boolean;
  token?: string;
  error?: string;
}

export interface TwoFactorDisableResult {
  success: boolean;
  error?: string;
}

export interface BackupCodeVerifyResult {
  success: boolean;
  valid: boolean;
  error?: string;
}

/**
 * Core authentication service interface
 *
 * This interface defines all authentication-related operations that can be performed.
 * Any implementation of this interface must provide all these methods.
 *
 * **Error handling:**
 * Methods should reject their returned promises when an operation fails due to
 * underlying provider errors or validation issues. Methods that return an
 * object with an `error` property should not reject the promise for expected
 * business errors (e.g. invalid credentials) but instead resolve with that
 * information.
*/
export interface AuthService {
  /**
   * Authenticate a user with email and password
   * 
   * @param credentials Login credentials including email, password and remember me option
   * @returns Authentication result with success status and user data or error
   */
  login(credentials: LoginPayload): Promise<AuthResult>;
  
  /**
   * Authenticate a user with email and password (with request context)
   * 
   * @param credentials Login credentials including email, password and remember me option
   * @param context Request context for logging and audit purposes
   * @returns Authentication result with success status and user data or error
   */
  login(credentials: LoginPayload, context: RequestContext): Promise<AuthResult>;
  
  /**
   * Register a new user
   * 
   * @param userData Registration data including email, password, name, etc.
   * @returns Authentication result with success status and user data or error
   */
  register(userData: RegistrationPayload): Promise<AuthResult>;
  
  /**
   * Register a new user (with request context)
   * 
   * @param userData Registration data including email, password, name, etc.
   * @param context Request context for logging and audit purposes
   * @returns Authentication result with success status and user data or error
   */
  register(userData: RegistrationPayload, context: RequestContext): Promise<AuthResult>;
  
  /**
   * Log out the current user
   */
  logout(): Promise<void>;
  
  /**
   * Log out the current user (with request context)
   * 
   * @param context Request context for logging and audit purposes
   */
  logout(context: RequestContext): Promise<void>;
  
  /**
   * Get the currently authenticated user
   *
   * @returns Promise that resolves with the current user or `null` if the
   *          session is not authenticated. The promise should reject if the
   *          underlying data provider fails to retrieve the user.
   */
  getCurrentUser(): Promise<User | null>;
  
  /**
   * Check if a user is currently authenticated
   * 
   * @returns True if a user is authenticated, false otherwise
   */
  isAuthenticated(): boolean;
  
  /**
   * Send a password reset email to the specified email address
   * 
   * @param email Email address to send the reset link to
   * @returns Result object with success status and message or error
   */
  resetPassword(email: string): Promise<{ success: boolean; message?: string; error?: string }>;

  /**
   * Update the user's password
   *
   * @param oldPassword Current password for verification
   * @param newPassword New password to set
   */
  updatePassword(oldPassword: string, newPassword: string): Promise<void>;

  /**
   * Verify a password reset token from the email link
   */
  verifyPasswordResetToken(token: string): Promise<{ valid: boolean; error?: string }>;

  /**
   * Update the password using a reset token and automatically log in
   */
  updatePasswordWithToken(
    token: string,
    newPassword: string,
  ): Promise<AuthResult>;
  
  /**
   * Send an email verification link to the specified email address
   * 
   * @param email Email address to verify
   * @returns Authentication result with success status or error
  */
  sendVerificationEmail(email: string): Promise<AuthResult>;

  /**
   * Send a passwordless login link to the specified email address
   *
   * @param email Email address to send the magic link to
   */
  sendMagicLink(email: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Verify an email address using a token
   *
   * @param token Verification token from the email link
   */
  verifyEmail(token: string): Promise<void>;

  /**
   * Verify a magic link token and authenticate the user
   *
   * @param token Magic link token
   * @returns Authentication result with success status and user data or error
   */
  verifyMagicLink(token: string): Promise<AuthResult>;
  
  /**
   * Delete the current user's account
   * 
   * @param passwordOrParams Either a password string or an object with userId and password
   */
  deleteAccount(passwordOrParams?: string | { userId: string; password: string }): Promise<{ success: boolean; error?: string }>;

  /**
   * Get account details for a user
   * 
   * @param userId User ID to get account details for
   * @returns User account details
   */
  getUserAccount(userId: string): Promise<any>;
  
  /**
   * Set up Multi-Factor Authentication for the current user
   * 
   * @returns MFA setup response with secret and QR code
   */
  setupMFA(): Promise<MFASetupResponse>;
  
  /**
   * Verify a Multi-Factor Authentication code
   * 
   * @param code MFA code from authenticator app
   * @returns MFA verification response with success status and token
   */
  verifyMFA(code: string): Promise<MFAVerifyResponse>;
  
  /**
   * Verify a Multi-Factor Authentication code (with request context)
   * 
   * @param code MFA code from authenticator app
   * @param context Request context for logging and audit purposes
   * @returns MFA verification response with success status and token
   */
  verifyMFA(code: string, context: RequestContext): Promise<MFAVerifyResponse>;
  
  /**
   * Disable Multi-Factor Authentication for the current user
   * 
   * @param code MFA code from authenticator app for verification
   * @returns Authentication result with success status or error
   */
  disableMFA(code: string): Promise<AuthResult>;

  /**
   * Check MFA requirements for a user after initial login
   * 
   * @param params MFA check parameters including access token and preferred method
   * @returns MFA check result with requirements and available methods
   */
  checkMfaRequirements(params: MfaCheckParams): Promise<MfaCheckResult>;

  /**
   * Verify MFA code during login flow
   * 
   * @param params MFA verification parameters including code, method, and access token
   * @returns MFA verification result with user and session data
   */
  verifyMfaCode(params: MfaVerifyParams): Promise<MfaVerifyResult>;

  /**
   * Resend MFA verification code via email
   * 
   * @param accessToken Temporary access token from initial login
   * @returns Result indicating success or failure of resend operation
   */
  resendMfaEmailCode(accessToken: string): Promise<MfaResendResult>;

  /**
   * Resend MFA verification code via SMS
   * 
   * @param accessToken Temporary access token from initial login
   * @returns Result indicating success or failure of resend operation
   */
  resendMfaSmsCode(accessToken: string): Promise<MfaResendResult>;

  /**
   * Configure an OAuth provider.
   *
   * @param config Provider configuration
   */
  configureOAuthProvider(config: OAuthProviderConfig): void;

  /**
   * Build an authorization URL for the given provider.
   *
   * @param provider OAuth provider identifier
   * @param state Optional state parameter for CSRF protection
   */
  getOAuthAuthorizationUrl(provider: OAuthProvider, state?: string): string;

  /**
   * Exchange an authorization code for an OAuth profile.
   *
   * @param provider OAuth provider identifier
   * @param code Authorization code returned by the provider
   * @returns The provider user profile
   */
  exchangeOAuthCode(
    provider: OAuthProvider,
    code: string
  ): Promise<OAuthUserProfile>;
  
  /**
   * Refresh the authentication token
   * 
   * @returns True if token was refreshed successfully, false otherwise
   */
  refreshToken(): Promise<boolean>;

  /**
   * Get the expiration timestamp of the current auth token.
   *
   * @returns Expiration time in milliseconds, or `null` if no active session.
   */
  getTokenExpiry(): number | null;
  
  /**
   * Handle session timeout by logging out the user
   */
  handleSessionTimeout(): void;
  
  /**
   * Subscribe to authentication state changes
   * 
   * @param callback Function to call when auth state changes
   * @returns Unsubscribe function
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void;

  // Additional MFA methods required by PRD Phase 4
  
  /**
   * Set up Two-Factor Authentication for the current user
   * Generates TOTP secret and QR code for authenticator apps
   * 
   * @returns TOTP setup result with secret, QR code, and backup codes
   */
  setupTwoFactor(): Promise<TwoFactorSetupResult>;

  /**
   * Verify a Two-Factor Authentication code during setup or login
   * 
   * @param code TOTP code from authenticator app
   * @returns Verification result
   */
  verifyTwoFactor(code: string): Promise<TwoFactorVerifyResult>;

  /**
   * Disable Two-Factor Authentication for the current user
   * 
   * @returns Disable result
   */
  disableTwoFactor(): Promise<TwoFactorDisableResult>;

  /**
   * Generate backup recovery codes for the user
   * Returns 8-10 unique 8-digit codes for account recovery
   * 
   * @returns Backup codes generation result
   */
  generateBackupCodes(): Promise<BackupCodeResult>;

  /**
   * Verify a backup code during authentication
   * Single-use codes that are consumed when used
   * 
   * @param code 8-digit backup code
   * @returns Verification result indicating if code is valid
   */
  verifyBackupCode(code: string): Promise<BackupCodeVerifyResult>;
}

/**
 * Authentication state interface
 * 
 * This interface defines the authentication state that can be observed.
 */
export interface AuthState {
  /**
   * Current user or null if not authenticated
   */
  user: User | null;
  
  /**
   * Authentication token or null if not authenticated
   */
  token: string | null;
  
  /**
   * True if authentication operations are in progress
   */
  isLoading: boolean;
  
  /**
   * True if a user is authenticated
   */
  isAuthenticated: boolean;
  
  /**
   * Error message if an authentication operation failed
   */
  error: string | null;
  
  /**
   * Success message after a successful operation
   */
  successMessage: string | null;
  
  /**
   * True if MFA is enabled for the current user
   */
  mfaEnabled: boolean;
}
