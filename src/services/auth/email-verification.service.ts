import { randomBytes } from 'crypto';
import type { AuthDataProvider } from '@/adapters/auth/interfaces';
import { sendVerificationEmail, sendWelcomeEmail } from '@/lib/email/templates';
import { logUserAction } from '@/lib/audit/auditLogger';
import { redis } from '@/lib/redis';

export interface EmailVerificationToken {
  token: string;
  email: string;
  userId: string;
  type: 'signup' | 'email_change';
  newEmail?: string; // For email change verification
  expiresAt: Date;
  attempts: number;
  sentCount: number;
  lastSentAt: Date;
  verifiedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface VerificationResult {
  success: boolean;
  message?: string;
  error?: string;
  email?: string;
  requiresLogin?: boolean;
}

export interface ResendResult {
  success: boolean;
  message?: string;
  error?: string;
  nextResendAt?: Date;
  remainingResends?: number;
}

export class EmailVerificationService {
  private readonly TOKEN_PREFIX = 'email_verify:';
  private readonly TOKEN_EXPIRY_HOURS = 24;
  private readonly MAX_RESEND_ATTEMPTS = 5;
  private readonly RESEND_COOLDOWN_MINUTES = 5;
  private readonly MAX_VERIFICATION_ATTEMPTS = 5;
  private readonly DUPLICATE_CHECK_DAYS = 7;

  constructor(
    private readonly authProvider: AuthDataProvider,
    private readonly emailEnabled: boolean = true
  ) {}

  /**
   * Send verification email for new signup
   */
  async sendSignupVerification(
    userId: string,
    email: string,
    userName?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<VerificationResult> {
    try {
      // Check if email is already verified
      const user = await this.authProvider.getUserById(userId);
      if (user?.emailVerified) {
        return {
          success: true,
          message: 'Email is already verified'
        };
      }

      // Check for existing active token
      const existingToken = await this.getActiveTokenByEmail(email);
      if (existingToken && existingToken.type === 'signup') {
        // Check if we can resend
        const cooldownResult = await this.checkResendCooldown(existingToken);
        if (!cooldownResult.canResend) {
          return {
            success: false,
            error: cooldownResult.reason,
            message: `Please wait ${cooldownResult.remainingMinutes} minutes before requesting another email`
          };
        }
      }

      // Generate new token
      const token = this.generateVerificationToken();
      const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_HOURS * 3600000);

      // Store token
      await this.storeToken({
        token,
        email,
        userId,
        type: 'signup',
        expiresAt,
        attempts: 0,
        sentCount: 1,
        lastSentAt: new Date(),
        ipAddress,
        userAgent
      });

      // Create verification URL
      const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${token}`;

      // Send email if enabled
      if (this.emailEnabled) {
        await sendVerificationEmail({
          to: email,
          userName: userName || email,
          verificationUrl,
          expiryHours: this.TOKEN_EXPIRY_HOURS,
          type: 'signup'
        });
      }

      await this.logVerificationAttempt(userId, email, 'SEND', true, 'signup', ipAddress);

      return {
        success: true,
        message: 'Verification email sent successfully',
        email: this.emailEnabled ? undefined : verificationUrl // Only return URL in dev/test
      };
    } catch (error) {
      console.error('Failed to send verification email:', error);
      await this.logVerificationAttempt(userId, email, 'SEND', false, 'signup', ipAddress);
      
      return {
        success: false,
        error: 'Failed to send verification email'
      };
    }
  }

  /**
   * Send verification for email change
   */
  async sendEmailChangeVerification(
    userId: string,
    currentEmail: string,
    newEmail: string,
    userName?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<VerificationResult> {
    try {
      // Check if new email is already in use
      const existingUser = await this.authProvider.getUserByEmail(newEmail);
      if (existingUser && existingUser.id !== userId) {
        return {
          success: false,
          error: 'This email address is already in use'
        };
      }

      // Check for duplicate change requests
      const isDuplicate = await this.checkDuplicateEmailChange(userId, newEmail);
      if (isDuplicate) {
        return {
          success: false,
          error: 'An email change request is already pending for this address'
        };
      }

      // Generate token
      const token = this.generateVerificationToken();
      const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_HOURS * 3600000);

      // Store token
      await this.storeToken({
        token,
        email: currentEmail,
        userId,
        type: 'email_change',
        newEmail,
        expiresAt,
        attempts: 0,
        sentCount: 1,
        lastSentAt: new Date(),
        ipAddress,
        userAgent
      });

      // Create verification URL
      const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${token}&type=change`;

      // Send emails to both addresses
      if (this.emailEnabled) {
        // Notify current email
        await sendVerificationEmail({
          to: currentEmail,
          userName: userName || currentEmail,
          verificationUrl,
          expiryHours: this.TOKEN_EXPIRY_HOURS,
          type: 'email_change_notification',
          newEmail
        });

        // Send verification to new email
        await sendVerificationEmail({
          to: newEmail,
          userName: userName || currentEmail,
          verificationUrl,
          expiryHours: this.TOKEN_EXPIRY_HOURS,
          type: 'email_change'
        });
      }

      await this.logVerificationAttempt(userId, newEmail, 'SEND', true, 'email_change', ipAddress);

      return {
        success: true,
        message: 'Verification emails sent to both addresses'
      };
    } catch (error) {
      console.error('Failed to send email change verification:', error);
      await this.logVerificationAttempt(userId, newEmail, 'SEND', false, 'email_change', ipAddress);
      
      return {
        success: false,
        error: 'Failed to send verification email'
      };
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string, ipAddress?: string): Promise<VerificationResult> {
    try {
      const tokenData = await this.getToken(token);
      
      if (!tokenData) {
        return {
          success: false,
          error: 'Invalid or expired verification token'
        };
      }

      // Check if token has expired
      if (new Date() > tokenData.expiresAt) {
        await this.invalidateToken(token);
        return {
          success: false,
          error: 'Verification token has expired. Please request a new one.'
        };
      }

      // Check if already verified
      if (tokenData.verifiedAt) {
        return {
          success: false,
          error: 'This email has already been verified'
        };
      }

      // Check attempt limit
      if (tokenData.attempts >= this.MAX_VERIFICATION_ATTEMPTS) {
        await this.invalidateToken(token);
        return {
          success: false,
          error: 'Too many failed verification attempts'
        };
      }

      // Increment attempts
      await this.incrementAttempts(token);

      // Get user
      const user = await this.authProvider.getUserById(tokenData.userId);
      if (!user) {
        return {
          success: false,
          error: 'User account not found'
        };
      }

      // Handle based on verification type
      if (tokenData.type === 'email_change' && tokenData.newEmail) {
        // Update user email
        const updateResult = await this.authProvider.updateUserEmail(
          tokenData.userId,
          tokenData.newEmail
        );

        if (!updateResult.success) {
          return {
            success: false,
            error: 'Failed to update email address'
          };
        }

        // Mark as verified
        await this.markTokenAsVerified(token);
        await this.logVerificationAttempt(
          tokenData.userId,
          tokenData.newEmail,
          'VERIFY',
          true,
          'email_change',
          ipAddress
        );

        return {
          success: true,
          message: 'Email address updated successfully',
          email: tokenData.newEmail,
          requiresLogin: true
        };
      } else {
        // Mark email as verified
        const verifyResult = await this.authProvider.verifyEmail(token);
        
        if (!verifyResult.success) {
          return {
            success: false,
            error: verifyResult.error || 'Failed to verify email'
          };
        }

        // Mark token as verified
        await this.markTokenAsVerified(token);

        // Send welcome email
        if (this.emailEnabled) {
          await sendWelcomeEmail({
            to: tokenData.email,
            userName: user.name || tokenData.email
          });
        }

        await this.logVerificationAttempt(
          tokenData.userId,
          tokenData.email,
          'VERIFY',
          true,
          'signup',
          ipAddress
        );

        return {
          success: true,
          message: 'Email verified successfully',
          email: tokenData.email
        };
      }
    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        error: 'Failed to verify email'
      };
    }
  }

  /**
   * Resend verification email
   */
  async resendVerification(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ResendResult> {
    try {
      // Get existing token
      const existingToken = await this.getActiveTokenByEmail(email);
      
      if (!existingToken) {
        // Try to find user by email
        const user = await this.authProvider.getUserByEmail(email);
        if (!user) {
          return {
            success: false,
            error: 'No pending verification found for this email'
          };
        }

        // Check if already verified
        if (user.emailVerified) {
          return {
            success: false,
            error: 'Email is already verified'
          };
        }

        // Create new verification
        const result = await this.sendSignupVerification(
          user.id,
          email,
          user.name,
          ipAddress,
          userAgent
        );

        return {
          success: result.success,
          message: result.message,
          error: result.error
        };
      }

      // Check cooldown
      const cooldownResult = await this.checkResendCooldown(existingToken);
      if (!cooldownResult.canResend) {
        return {
          success: false,
          error: cooldownResult.reason,
          nextResendAt: cooldownResult.nextResendAt,
          remainingResends: this.MAX_RESEND_ATTEMPTS - existingToken.sentCount
        };
      }

      // Check max resend attempts
      if (existingToken.sentCount >= this.MAX_RESEND_ATTEMPTS) {
        return {
          success: false,
          error: 'Maximum resend attempts reached. Please contact support.',
          remainingResends: 0
        };
      }

      // Update token with new sent count
      existingToken.sentCount++;
      existingToken.lastSentAt = new Date();
      await this.updateToken(existingToken);

      // Create verification URL
      const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${existingToken.token}`;

      // Resend email
      if (this.emailEnabled) {
        const user = await this.authProvider.getUserById(existingToken.userId);
        
        await sendVerificationEmail({
          to: existingToken.email,
          userName: user?.name || existingToken.email,
          verificationUrl,
          expiryHours: Math.floor(
            (existingToken.expiresAt.getTime() - Date.now()) / 3600000
          ),
          type: existingToken.type,
          resend: true
        });
      }

      await this.logVerificationAttempt(
        existingToken.userId,
        existingToken.email,
        'RESEND',
        true,
        existingToken.type,
        ipAddress
      );

      return {
        success: true,
        message: 'Verification email resent successfully',
        remainingResends: this.MAX_RESEND_ATTEMPTS - existingToken.sentCount
      };
    } catch (error) {
      console.error('Failed to resend verification:', error);
      return {
        success: false,
        error: 'Failed to resend verification email'
      };
    }
  }

  /**
   * Check resend cooldown
   */
  private async checkResendCooldown(
    token: EmailVerificationToken
  ): Promise<{ canResend: boolean; reason?: string; nextResendAt?: Date; remainingMinutes?: number }> {
    const now = Date.now();
    const lastSent = token.lastSentAt.getTime();
    const cooldownMs = this.RESEND_COOLDOWN_MINUTES * 60000;
    const timeSinceLastSend = now - lastSent;

    if (timeSinceLastSend < cooldownMs) {
      const remainingMs = cooldownMs - timeSinceLastSend;
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      const nextResendAt = new Date(lastSent + cooldownMs);

      return {
        canResend: false,
        reason: `Please wait ${remainingMinutes} minutes before requesting another email`,
        nextResendAt,
        remainingMinutes
      };
    }

    return { canResend: true };
  }

  /**
   * Check for duplicate email change requests
   */
  private async checkDuplicateEmailChange(
    userId: string,
    newEmail: string
  ): Promise<boolean> {
    const key = `email_change:${userId}:${newEmail}`;
    const exists = await redis.get(key);
    
    if (exists) {
      return true;
    }

    // Set with expiry to prevent duplicates
    await redis.setex(key, this.DUPLICATE_CHECK_DAYS * 86400, '1');
    return false;
  }

  /**
   * Generate secure verification token
   */
  private generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Store token in Redis
   */
  private async storeToken(tokenData: EmailVerificationToken): Promise<void> {
    const key = `${this.TOKEN_PREFIX}${tokenData.token}`;
    const emailKey = `${this.TOKEN_PREFIX}email:${tokenData.email}`;
    const ttl = Math.floor((tokenData.expiresAt.getTime() - Date.now()) / 1000);
    
    await redis.setex(key, ttl, JSON.stringify(tokenData));
    
    // Also store by email for lookup
    await redis.setex(emailKey, ttl, tokenData.token);
  }

  /**
   * Update existing token
   */
  private async updateToken(tokenData: EmailVerificationToken): Promise<void> {
    const key = `${this.TOKEN_PREFIX}${tokenData.token}`;
    const ttl = await redis.ttl(key);
    
    if (ttl > 0) {
      await redis.setex(key, ttl, JSON.stringify(tokenData));
    }
  }

  /**
   * Get token from storage
   */
  private async getToken(token: string): Promise<EmailVerificationToken | null> {
    const key = `${this.TOKEN_PREFIX}${token}`;
    const data = await redis.get(key);
    
    if (!data) {
      return null;
    }

    const tokenData = JSON.parse(data);
    // Convert date strings back to Date objects
    tokenData.expiresAt = new Date(tokenData.expiresAt);
    tokenData.lastSentAt = new Date(tokenData.lastSentAt);
    if (tokenData.verifiedAt) {
      tokenData.verifiedAt = new Date(tokenData.verifiedAt);
    }

    return tokenData;
  }

  /**
   * Get active token by email
   */
  private async getActiveTokenByEmail(email: string): Promise<EmailVerificationToken | null> {
    const emailKey = `${this.TOKEN_PREFIX}email:${email}`;
    const token = await redis.get(emailKey);
    
    if (!token) {
      return null;
    }

    return this.getToken(token);
  }

  /**
   * Increment verification attempts
   */
  private async incrementAttempts(token: string): Promise<void> {
    const tokenData = await this.getToken(token);
    if (tokenData) {
      tokenData.attempts++;
      await this.updateToken(tokenData);
    }
  }

  /**
   * Mark token as verified
   */
  private async markTokenAsVerified(token: string): Promise<void> {
    const tokenData = await this.getToken(token);
    if (tokenData) {
      tokenData.verifiedAt = new Date();
      const key = `${this.TOKEN_PREFIX}${token}`;
      // Keep for audit trail with shorter expiry
      await redis.setex(key, 86400, JSON.stringify(tokenData)); // 24 hours
    }
  }

  /**
   * Invalidate token
   */
  private async invalidateToken(token: string): Promise<void> {
    const tokenData = await this.getToken(token);
    if (tokenData) {
      const key = `${this.TOKEN_PREFIX}${token}`;
      const emailKey = `${this.TOKEN_PREFIX}email:${tokenData.email}`;
      
      await redis.del(key);
      await redis.del(emailKey);
    }
  }

  /**
   * Log verification attempt
   */
  private async logVerificationAttempt(
    userId: string,
    email: string,
    action: 'SEND' | 'VERIFY' | 'RESEND',
    success: boolean,
    type: 'signup' | 'email_change',
    ipAddress?: string
  ): Promise<void> {
    try {
      await logUserAction({
        userId,
        action: `EMAIL_VERIFICATION_${action}`,
        status: success ? 'SUCCESS' : 'FAILURE',
        targetResourceType: 'auth',
        targetResourceId: email,
        details: { type },
        ipAddress
      });
    } catch (error) {
      console.error('Failed to log verification attempt:', error);
    }
  }
}