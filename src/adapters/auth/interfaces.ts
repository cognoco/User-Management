/**
 * Authentication Data Provider Interface
 *
 * Defines the contract for persistence operations related to authentication.
 * This abstraction allows the service layer to work with any data source.
 */
import type {
  AuthResult,
  LoginPayload,
  RegistrationPayload,
  User,
  MFASetupResponse,
  MFAVerifyResponse,
} from '@/core/auth/models';
import type {
  TwoFactorSetupResult,
  TwoFactorVerifyResult,
  TwoFactorDisableResult,
  BackupCodeResult,
  BackupCodeVerifyResult
} from '@/core/auth/interfaces';

export interface AuthDataProvider {
  /**
   * Authenticate a user with email and password.
   *
   * @param credentials - Login credentials including email, password and optional remember me flag
   * @returns Promise resolving to an {@link AuthResult} describing the outcome
   */
  login(credentials: LoginPayload): Promise<AuthResult>;

  /**
   * Register a new user.
   *
   * @param userData Registration data including email, password and profile info
   * @returns Authentication result with success status and user data or error
   */
  register(userData: RegistrationPayload): Promise<AuthResult>;

  /**
   * Log out the currently authenticated user.
   *
   * Implementations should clear any stored session information.
   */
  logout(): Promise<void>;

  /**
   * Get the currently authenticated user.
   *
   * @returns The current user or null if not authenticated
   */
  getCurrentUser(): Promise<User | null>;

  /**
   * Send a password reset email.
   *
   * @param email Email address to send the reset link to
   * @returns Result object with success status and message or error
   */
  resetPassword(email: string): Promise<{ success: boolean; message?: string; error?: string }>;

  /**
   * Update the user's password.
   *
   * @param oldPassword Current password for verification
   * @param newPassword New password to set
   */
  updatePassword(oldPassword: string, newPassword: string): Promise<void>;

  /**
   * Verify a password reset token
   */
  verifyPasswordResetToken(token: string): Promise<{ valid: boolean; user?: User; token?: string; error?: string }>;

  /**
   * Update password using a reset token
   */
  updatePasswordWithToken(token: string, newPassword: string): Promise<AuthResult>;

  /**
   * Invalidate all sessions for the given user
   */
  invalidateSessions(userId: string): Promise<void>;

  /**
   * Send an email verification link.
   *
   * @param email Email address to verify
   * @returns Authentication result with success status or error
  */
  sendVerificationEmail(email: string): Promise<AuthResult>;

  /**
   * Send a passwordless login link to the specified email address.
   */
  sendMagicLink(email: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Verify an email address using a verification token.
   *
   * @param token - Verification token from the email link
  */
  verifyEmail(token: string): Promise<void>;

  /**
   * Verify a magic link token and authenticate the user.
   */
  verifyMagicLink(token: string): Promise<AuthResult>;

  /**
   * Permanently delete the current user's account.
   *
   * @param password - Current password for verification (optional depending on implementation)
   */
  deleteAccount(password?: string): Promise<void>;

  /**
   * Set up Multi-Factor Authentication for the current user.
   *
   * @returns MFA setup response with secret and QR code
   */
  setupMFA(): Promise<MFASetupResponse>;

  /**
   * Verify a Multi-Factor Authentication code.
   *
   * @param code MFA code from authenticator app
   * @returns MFA verification response with success status and token
   */
  verifyMFA(code: string): Promise<MFAVerifyResponse>;

  /**
   * Disable Multi-Factor Authentication for the current user.
   *
   * @param code MFA code from authenticator app for verification
   * @returns Authentication result with success status or error
   */
  disableMFA(code: string): Promise<AuthResult>;

  /**
   * Begin WebAuthn registration for the current user.
   */
  startWebAuthnRegistration(): Promise<MFASetupResponse>;

  /**
   * Complete WebAuthn registration with client response.
   */
  verifyWebAuthnRegistration(data: unknown): Promise<MFAVerifyResponse>;

  /**
   * Refresh the authentication token.
   *
   * @returns True if token was refreshed successfully, false otherwise
   */
  refreshToken(): Promise<
    | { accessToken: string; refreshToken: string; expiresAt: number }
    | null
  >;

  /**
   * Subscribe to authentication state changes.
   *
   * @param callback Function to call when authentication state changes
   * @returns Unsubscribe function
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void;

  /**
   * Handle session expiration by cleaning up authentication state.
   *
   * Implementations should remove any cached tokens or user data and
   * notify listeners if applicable. The default implementation may simply
   * call {@link logout} but more advanced providers can perform additional
   * cleanup.
   */
  handleSessionTimeout(): void;

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


