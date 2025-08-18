import { randomBytes } from 'crypto';
import type { AuthDataProvider } from '@/adapters/auth/interfaces';
import { sendPasswordResetEmail, sendPasswordResetConfirmation } from '@/lib/email/templates';
import { logUserAction } from '@/lib/audit/auditLogger';
import { redis } from '@/lib/redis';

export interface PasswordResetToken {
  token: string;
  email: string;
  expiresAt: Date;
  usedAt?: Date;
  attempts: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface PasswordResetResult {
  success: boolean;
  message?: string;
  error?: string;
  resetUrl?: string;
}

export interface TokenValidationResult {
  valid: boolean;
  email?: string;
  error?: string;
  remainingTime?: number; // in seconds
}

export class PasswordResetService {
  private readonly TOKEN_PREFIX = 'password_reset:';
  private readonly TOKEN_EXPIRY_MINUTES = 30;
  private readonly MAX_ATTEMPTS = 3;
  private readonly RATE_LIMIT_MINUTES = 15;
  private readonly MAX_REQUESTS_PER_IP = 5;

  constructor(
    private readonly authProvider: AuthDataProvider,
    private readonly emailEnabled: boolean = true
  ) {}

  /**
   * Initiate password reset process
   */
  async requestPasswordReset(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PasswordResetResult> {
    try {
      // Check rate limiting
      const rateLimitResult = await this.checkRateLimit(email, ipAddress);
      if (!rateLimitResult.allowed) {
        return {
          success: false,
          error: rateLimitResult.reason,
          message: 'Too many reset attempts. Please try again later.'
        };
      }

      // Check if user exists (without revealing this to the caller)
      const user = await this.authProvider.getUserByEmail(email);
      
      // Always return success to prevent email enumeration
      if (!user) {
        await this.logResetAttempt(email, false, 'User not found', ipAddress, userAgent);
        return {
          success: true,
          message: 'If an account exists with this email, you will receive password reset instructions.'
        };
      }

      // Check if user has a recent unexpired token
      const existingToken = await this.getActiveToken(email);
      if (existingToken) {
        const remainingMinutes = Math.floor(
          (existingToken.expiresAt.getTime() - Date.now()) / 60000
        );
        
        if (remainingMinutes > 25) {
          // Token was just created, don't create a new one
          return {
            success: true,
            message: 'A password reset email has already been sent. Please check your inbox.'
          };
        }
      }

      // Generate new token
      const token = this.generateSecureToken();
      const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_MINUTES * 60000);

      // Store token
      await this.storeToken({
        token,
        email,
        expiresAt,
        attempts: 0,
        ipAddress,
        userAgent
      });

      // Create reset URL
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;

      // Send email if enabled
      if (this.emailEnabled) {
        await sendPasswordResetEmail({
          to: email,
          userName: user.name || email,
          resetUrl,
          expiryMinutes: this.TOKEN_EXPIRY_MINUTES,
          ipAddress,
          browserInfo: userAgent
        });
      }

      await this.logResetAttempt(email, true, 'Token generated', ipAddress, userAgent);

      return {
        success: true,
        message: 'Password reset email sent successfully.',
        resetUrl: this.emailEnabled ? undefined : resetUrl // Only return URL in dev/test
      };
    } catch (error) {
      console.error('Password reset request error:', error);
      await this.logResetAttempt(email, false, error?.message, ipAddress, userAgent);
      
      // Don't reveal internal errors
      return {
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.'
      };
    }
  }

  /**
   * Validate password reset token
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      const tokenData = await this.getToken(token);
      
      if (!tokenData) {
        return {
          valid: false,
          error: 'Invalid or expired reset token'
        };
      }

      // Check if token has expired
      if (new Date() > tokenData.expiresAt) {
        await this.invalidateToken(token);
        return {
          valid: false,
          error: 'Reset token has expired. Please request a new one.'
        };
      }

      // Check if token has been used
      if (tokenData.usedAt) {
        return {
          valid: false,
          error: 'This reset token has already been used.'
        };
      }

      // Check attempt limit
      if (tokenData.attempts >= this.MAX_ATTEMPTS) {
        await this.invalidateToken(token);
        return {
          valid: false,
          error: 'Too many failed attempts. Please request a new reset token.'
        };
      }

      const remainingTime = Math.floor(
        (tokenData.expiresAt.getTime() - Date.now()) / 1000
      );

      return {
        valid: true,
        email: tokenData.email,
        remainingTime
      };
    } catch (error) {
      console.error('Token validation error:', error);
      return {
        valid: false,
        error: 'Failed to validate token'
      };
    }
  }

  /**
   * Reset password using token
   */
  async resetPasswordWithToken(
    token: string,
    newPassword: string,
    confirmPassword?: string
  ): Promise<PasswordResetResult> {
    try {
      // Validate passwords match if confirmation provided
      if (confirmPassword && newPassword !== confirmPassword) {
        return {
          success: false,
          error: 'Passwords do not match'
        };
      }

      // Validate token
      const validation = await this.validateToken(token);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      const tokenData = await this.getToken(token);
      if (!tokenData) {
        return {
          success: false,
          error: 'Invalid token'
        };
      }

      // Increment attempts
      await this.incrementAttempts(token);

      // Validate password strength
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: passwordValidation.error
        };
      }

      // Get user
      const user = await this.authProvider.getUserByEmail(tokenData.email);
      if (!user) {
        return {
          success: false,
          error: 'User account not found'
        };
      }

      // Update password
      const updateResult = await this.authProvider.updatePasswordWithToken(
        token,
        newPassword
      );

      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error || 'Failed to update password'
        };
      }

      // Mark token as used
      await this.markTokenAsUsed(token);

      // Invalidate all other reset tokens for this user
      await this.invalidateUserTokens(tokenData.email);

      // Invalidate all sessions for security
      if (user.id) {
        await this.authProvider.invalidateSessions(user.id);
      }

      // Send confirmation email
      if (this.emailEnabled) {
        await sendPasswordResetConfirmation({
          to: tokenData.email,
          userName: user.name || tokenData.email,
          ipAddress: tokenData.ipAddress,
          timestamp: new Date()
        });
      }

      await logUserAction({
        userId: user.id,
        action: 'PASSWORD_RESET_COMPLETED',
        status: 'SUCCESS',
        targetResourceType: 'auth',
        targetResourceId: user.id,
        ipAddress: tokenData.ipAddress,
        userAgent: tokenData.userAgent
      });

      return {
        success: true,
        message: 'Password has been reset successfully. Please log in with your new password.'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: 'Failed to reset password. Please try again.'
      };
    }
  }

  /**
   * Check rate limiting for password reset requests
   */
  private async checkRateLimit(
    email: string,
    ipAddress?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (!ipAddress) {
      // Can't rate limit without IP
      return { allowed: true };
    }

    const rateLimitKey = `rate_limit:password_reset:${ipAddress}`;
    
    try {
      // Get current count
      const count = await redis.incr(rateLimitKey);
      
      if (count === 1) {
        // First request, set expiry
        await redis.expire(rateLimitKey, this.RATE_LIMIT_MINUTES * 60);
      }

      if (count > this.MAX_REQUESTS_PER_IP) {
        const ttl = await redis.ttl(rateLimitKey);
        return {
          allowed: false,
          reason: `Rate limit exceeded. Please wait ${Math.ceil(ttl / 60)} minutes.`
        };
      }

      // Also check per-email rate limit
      const emailLimitKey = `rate_limit:password_reset:email:${email}`;
      const emailCount = await redis.incr(emailLimitKey);
      
      if (emailCount === 1) {
        await redis.expire(emailLimitKey, this.RATE_LIMIT_MINUTES * 60);
      }

      if (emailCount > 3) {
        return {
          allowed: false,
          reason: 'Too many reset attempts for this email address.'
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Allow on error to not block legitimate requests
      return { allowed: true };
    }
  }

  /**
   * Generate cryptographically secure token
   */
  private generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Store token in Redis
   */
  private async storeToken(tokenData: PasswordResetToken): Promise<void> {
    const key = `${this.TOKEN_PREFIX}${tokenData.token}`;
    const emailKey = `${this.TOKEN_PREFIX}email:${tokenData.email}`;
    
    await redis.setex(
      key,
      this.TOKEN_EXPIRY_MINUTES * 60,
      JSON.stringify(tokenData)
    );

    // Also store by email for duplicate checking
    await redis.setex(
      emailKey,
      this.TOKEN_EXPIRY_MINUTES * 60,
      tokenData.token
    );
  }

  /**
   * Get token from storage
   */
  private async getToken(token: string): Promise<PasswordResetToken | null> {
    const key = `${this.TOKEN_PREFIX}${token}`;
    const data = await redis.get(key);
    
    if (!data) {
      return null;
    }

    const tokenData = JSON.parse(data);
    // Convert date strings back to Date objects
    tokenData.expiresAt = new Date(tokenData.expiresAt);
    if (tokenData.usedAt) {
      tokenData.usedAt = new Date(tokenData.usedAt);
    }

    return tokenData;
  }

  /**
   * Get active token for email
   */
  private async getActiveToken(email: string): Promise<PasswordResetToken | null> {
    const emailKey = `${this.TOKEN_PREFIX}email:${email}`;
    const token = await redis.get(emailKey);
    
    if (!token) {
      return null;
    }

    return this.getToken(token);
  }

  /**
   * Increment failed attempts
   */
  private async incrementAttempts(token: string): Promise<void> {
    const tokenData = await this.getToken(token);
    if (tokenData) {
      tokenData.attempts++;
      const key = `${this.TOKEN_PREFIX}${token}`;
      const ttl = await redis.ttl(key);
      await redis.setex(key, ttl, JSON.stringify(tokenData));
    }
  }

  /**
   * Mark token as used
   */
  private async markTokenAsUsed(token: string): Promise<void> {
    const tokenData = await this.getToken(token);
    if (tokenData) {
      tokenData.usedAt = new Date();
      const key = `${this.TOKEN_PREFIX}${token}`;
      // Keep for audit trail but with shorter expiry
      await redis.setex(key, 3600, JSON.stringify(tokenData)); // 1 hour
    }
  }

  /**
   * Invalidate token
   */
  private async invalidateToken(token: string): Promise<void> {
    const key = `${this.TOKEN_PREFIX}${token}`;
    await redis.del(key);
  }

  /**
   * Invalidate all tokens for a user
   */
  private async invalidateUserTokens(email: string): Promise<void> {
    const emailKey = `${this.TOKEN_PREFIX}email:${email}`;
    const token = await redis.get(emailKey);
    
    if (token) {
      await this.invalidateToken(token);
    }
    
    await redis.del(emailKey);
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): { valid: boolean; error?: string } {
    if (password.length < 8) {
      return {
        valid: false,
        error: 'Password must be at least 8 characters long'
      };
    }

    if (!/[A-Z]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one uppercase letter'
      };
    }

    if (!/[a-z]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one lowercase letter'
      };
    }

    if (!/[0-9]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one number'
      };
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one special character'
      };
    }

    return { valid: true };
  }

  /**
   * Log password reset attempt
   */
  private async logResetAttempt(
    email: string,
    success: boolean,
    details?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await logUserAction({
        action: 'PASSWORD_RESET_REQUEST',
        status: success ? 'SUCCESS' : 'FAILURE',
        targetResourceType: 'auth',
        targetResourceId: email,
        details: { message: details },
        ipAddress,
        userAgent
      });
    } catch (error) {
      console.error('Failed to log reset attempt:', error);
    }
  }
}