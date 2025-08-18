import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PasswordResetService } from '@/services/auth/password-reset.service';
import { EmailVerificationService } from '@/services/auth/email-verification.service';
import type { AuthDataProvider } from '@/adapters/auth/interfaces';

// Mock providers
const mockAuthProvider: Partial<AuthDataProvider> = {
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  updatePasswordWithToken: vi.fn(),
  verifyEmail: vi.fn(),
  updateUserEmail: vi.fn(),
  invalidateSessions: vi.fn()
};

// Mock Redis
vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    exists: vi.fn()
  }
}));

// Mock email templates
vi.mock('@/lib/email/templates', () => ({
  sendPasswordResetEmail: vi.fn(),
  sendPasswordResetConfirmation: vi.fn(),
  sendVerificationEmail: vi.fn(),
  sendWelcomeEmail: vi.fn()
}));

// Mock audit logger
vi.mock('@/lib/audit/auditLogger', () => ({
  logUserAction: vi.fn()
}));

import { redis } from '@/lib/redis';
import * as emailTemplates from '@/lib/email/templates';

describe('Password Reset Service', () => {
  let passwordResetService: PasswordResetService;

  beforeEach(() => {
    vi.clearAllMocks();
    passwordResetService = new PasswordResetService(
      mockAuthProvider as AuthDataProvider,
      false // Disable actual email sending for tests
    );
  });

  describe('requestPasswordReset', () => {
    it('should generate and store reset token for valid email', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'user@example.com',
        name: 'Test User'
      };

      mockAuthProvider.getUserByEmail.mockResolvedValue(mockUser);
      redis.get.mockResolvedValue(null); // No existing token
      redis.incr.mockResolvedValue(1); // First request
      redis.setex.mockResolvedValue(undefined);

      const result = await passwordResetService.requestPasswordReset(
        'user@example.com',
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Password reset email sent');
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should handle rate limiting', async () => {
      redis.incr.mockResolvedValue(6); // Exceeded limit
      redis.ttl.mockResolvedValue(600); // 10 minutes remaining

      const result = await passwordResetService.requestPasswordReset(
        'user@example.com',
        '192.168.1.1'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('should not reveal if email does not exist', async () => {
      mockAuthProvider.getUserByEmail.mockResolvedValue(null);
      redis.incr.mockResolvedValue(1);

      const result = await passwordResetService.requestPasswordReset(
        'nonexistent@example.com'
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('If an account exists with this email, you will receive password reset instructions.');
    });

    it('should handle existing unexpired token', async () => {
      const existingToken = {
        token: 'existing_token',
        email: 'user@example.com',
        expiresAt: new Date(Date.now() + 28 * 60000), // 28 minutes remaining
        attempts: 0
      };

      mockAuthProvider.getUserByEmail.mockResolvedValue({ id: 'user_123' });
      redis.get.mockImplementation(async (key: string) => {
        if (key.includes('email:')) {
          return 'existing_token';
        }
        if (key.includes('existing_token')) {
          return JSON.stringify(existingToken);
        }
        return null;
      });
      redis.incr.mockResolvedValue(1);

      const result = await passwordResetService.requestPasswordReset('user@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('already been sent');
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      const validToken = {
        token: 'valid_token',
        email: 'user@example.com',
        expiresAt: new Date(Date.now() + 15 * 60000), // 15 minutes remaining
        attempts: 0,
        userId: 'user_123'
      };

      redis.get.mockResolvedValue(JSON.stringify(validToken));

      const result = await passwordResetService.validateToken('valid_token');

      expect(result.valid).toBe(true);
      expect(result.email).toBe('user@example.com');
      expect(result.remainingTime).toBeGreaterThan(0);
    });

    it('should reject expired token', async () => {
      const expiredToken = {
        token: 'expired_token',
        email: 'user@example.com',
        expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
        attempts: 0
      };

      redis.get.mockResolvedValue(JSON.stringify(expiredToken));
      redis.del.mockResolvedValue(undefined);

      const result = await passwordResetService.validateToken('expired_token');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
      expect(redis.del).toHaveBeenCalled();
    });

    it('should reject token with too many attempts', async () => {
      const tokenWithAttempts = {
        token: 'attempted_token',
        email: 'user@example.com',
        expiresAt: new Date(Date.now() + 15 * 60000),
        attempts: 3 // Max attempts reached
      };

      redis.get.mockResolvedValue(JSON.stringify(tokenWithAttempts));
      redis.del.mockResolvedValue(undefined);

      const result = await passwordResetService.validateToken('attempted_token');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Too many failed attempts');
    });

    it('should handle already used token', async () => {
      const usedToken = {
        token: 'used_token',
        email: 'user@example.com',
        expiresAt: new Date(Date.now() + 15 * 60000),
        attempts: 1,
        usedAt: new Date()
      };

      redis.get.mockResolvedValue(JSON.stringify(usedToken));

      const result = await passwordResetService.validateToken('used_token');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('already been used');
    });
  });

  describe('resetPasswordWithToken', () => {
    it('should successfully reset password with valid token', async () => {
      const validToken = {
        token: 'reset_token',
        email: 'user@example.com',
        userId: 'user_123',
        expiresAt: new Date(Date.now() + 15 * 60000),
        attempts: 0
      };

      const mockUser = {
        id: 'user_123',
        email: 'user@example.com',
        name: 'Test User'
      };

      redis.get.mockResolvedValue(JSON.stringify(validToken));
      redis.ttl.mockResolvedValue(900);
      redis.setex.mockResolvedValue(undefined);
      redis.del.mockResolvedValue(undefined);
      
      mockAuthProvider.getUserByEmail.mockResolvedValue(mockUser);
      mockAuthProvider.updatePasswordWithToken.mockResolvedValue({
        success: true,
        user: mockUser
      });
      mockAuthProvider.invalidateSessions.mockResolvedValue(undefined);

      const result = await passwordResetService.resetPasswordWithToken(
        'reset_token',
        'NewSecurePass123!'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
      expect(mockAuthProvider.updatePasswordWithToken).toHaveBeenCalledWith(
        'reset_token',
        'NewSecurePass123'
      );
      expect(mockAuthProvider.invalidateSessions).toHaveBeenCalledWith('user_123');
    });

    it('should validate password strength', async () => {
      const result = await passwordResetService.resetPasswordWithToken(
        'token',
        'weak'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 8 characters');
    });

    it('should check password confirmation if provided', async () => {
      const result = await passwordResetService.resetPasswordWithToken(
        'token',
        'NewSecurePass123!',
        'DifferentPass123!'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Passwords do not match');
    });
  });
});

describe('Email Verification Service', () => {
  let emailVerificationService: EmailVerificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    emailVerificationService = new EmailVerificationService(
      mockAuthProvider as AuthDataProvider,
      false // Disable actual email sending for tests
    );
  });

  describe('sendSignupVerification', () => {
    it('should send verification email for new signup', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'new@example.com',
        emailVerified: false
      };

      mockAuthProvider.getUserById.mockResolvedValue(mockUser);
      redis.get.mockResolvedValue(null); // No existing token
      redis.setex.mockResolvedValue(undefined);

      const result = await emailVerificationService.sendSignupVerification(
        'user_123',
        'new@example.com',
        'New User',
        '192.168.1.1'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Verification email sent');
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should handle already verified email', async () => {
      const verifiedUser = {
        id: 'user_123',
        email: 'verified@example.com',
        emailVerified: true
      };

      mockAuthProvider.getUserById.mockResolvedValue(verifiedUser);

      const result = await emailVerificationService.sendSignupVerification(
        'user_123',
        'verified@example.com'
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email is already verified');
    });

    it('should enforce resend cooldown', async () => {
      const existingToken = {
        token: 'existing_token',
        email: 'user@example.com',
        type: 'signup',
        lastSentAt: new Date(), // Just sent
        sentCount: 1,
        expiresAt: new Date(Date.now() + 24 * 3600000)
      };

      mockAuthProvider.getUserById.mockResolvedValue({ emailVerified: false });
      redis.get.mockImplementation(async (key: string) => {
        if (key.includes('email:')) {
          return 'existing_token';
        }
        if (key.includes('existing_token')) {
          return JSON.stringify(existingToken);
        }
        return null;
      });

      const result = await emailVerificationService.sendSignupVerification(
        'user_123',
        'user@example.com'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('wait');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      const validToken = {
        token: 'verify_token',
        email: 'user@example.com',
        userId: 'user_123',
        type: 'signup',
        expiresAt: new Date(Date.now() + 3600000),
        attempts: 0
      };

      const mockUser = {
        id: 'user_123',
        email: 'user@example.com',
        name: 'Test User'
      };

      redis.get.mockResolvedValue(JSON.stringify(validToken));
      redis.ttl.mockResolvedValue(3600);
      redis.setex.mockResolvedValue(undefined);
      
      mockAuthProvider.getUserById.mockResolvedValue(mockUser);
      mockAuthProvider.verifyEmail.mockResolvedValue({ success: true });

      const result = await emailVerificationService.verifyEmail('verify_token');

      expect(result.success).toBe(true);
      expect(result.message).toContain('verified successfully');
      expect(mockAuthProvider.verifyEmail).toHaveBeenCalled();
    });

    it('should handle email change verification', async () => {
      const changeToken = {
        token: 'change_token',
        email: 'old@example.com',
        userId: 'user_123',
        type: 'email_change',
        newEmail: 'new@example.com',
        expiresAt: new Date(Date.now() + 3600000),
        attempts: 0
      };

      mockAuthProvider.getUserById.mockResolvedValue({ id: 'user_123' });
      mockAuthProvider.updateUserEmail.mockResolvedValue({ success: true });
      
      redis.get.mockResolvedValue(JSON.stringify(changeToken));
      redis.ttl.mockResolvedValue(3600);
      redis.setex.mockResolvedValue(undefined);

      const result = await emailVerificationService.verifyEmail('change_token');

      expect(result.success).toBe(true);
      expect(result.email).toBe('new@example.com');
      expect(result.requiresLogin).toBe(true);
      expect(mockAuthProvider.updateUserEmail).toHaveBeenCalledWith(
        'user_123',
        'new@example.com'
      );
    });

    it('should reject expired token', async () => {
      const expiredToken = {
        token: 'expired_token',
        expiresAt: new Date(Date.now() - 3600000) // Expired
      };

      redis.get.mockResolvedValue(JSON.stringify(expiredToken));
      redis.del.mockResolvedValue(undefined);

      const result = await emailVerificationService.verifyEmail('expired_token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });
  });

  describe('resendVerification', () => {
    it('should resend verification with cooldown respected', async () => {
      const existingToken = {
        token: 'resend_token',
        email: 'user@example.com',
        userId: 'user_123',
        type: 'signup',
        lastSentAt: new Date(Date.now() - 6 * 60000), // 6 minutes ago
        sentCount: 1,
        expiresAt: new Date(Date.now() + 3600000),
        attempts: 0
      };

      redis.get.mockImplementation(async (key: string) => {
        if (key.includes('email:')) {
          return 'resend_token';
        }
        if (key.includes('resend_token')) {
          return JSON.stringify(existingToken);
        }
        return null;
      });
      redis.ttl.mockResolvedValue(3600);
      redis.setex.mockResolvedValue(undefined);
      
      mockAuthProvider.getUserById.mockResolvedValue({ 
        id: 'user_123',
        name: 'Test User'
      });

      const result = await emailVerificationService.resendVerification(
        'user@example.com'
      );

      expect(result.success).toBe(true);
      expect(result.remainingResends).toBe(3); // 5 max - 2 sent
    });

    it('should enforce max resend attempts', async () => {
      const maxedToken = {
        token: 'maxed_token',
        email: 'user@example.com',
        sentCount: 5, // Max reached
        lastSentAt: new Date(Date.now() - 10 * 60000),
        expiresAt: new Date(Date.now() + 3600000)
      };

      redis.get.mockImplementation(async (key: string) => {
        if (key.includes('email:')) {
          return 'maxed_token';
        }
        if (key.includes('maxed_token')) {
          return JSON.stringify(maxedToken);
        }
        return null;
      });

      const result = await emailVerificationService.resendVerification(
        'user@example.com'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum resend attempts');
      expect(result.remainingResends).toBe(0);
    });

    it('should create new verification if no pending token', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'user@example.com',
        name: 'Test User',
        emailVerified: false
      };

      redis.get.mockResolvedValue(null); // No existing token
      mockAuthProvider.getUserByEmail.mockResolvedValue(mockUser);
      mockAuthProvider.getUserById.mockResolvedValue(mockUser);
      redis.setex.mockResolvedValue(undefined);

      const result = await emailVerificationService.resendVerification(
        'user@example.com'
      );

      expect(result.success).toBe(true);
      expect(redis.setex).toHaveBeenCalled();
    });
  });

  describe('sendEmailChangeVerification', () => {
    it('should send verification for email change', async () => {
      mockAuthProvider.getUserByEmail.mockResolvedValue(null); // New email not in use
      redis.get.mockResolvedValue(null); // No duplicate request
      redis.setex.mockResolvedValue(undefined);

      const result = await emailVerificationService.sendEmailChangeVerification(
        'user_123',
        'old@example.com',
        'new@example.com',
        'Test User'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('both addresses');
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should prevent duplicate email usage', async () => {
      mockAuthProvider.getUserByEmail.mockResolvedValue({
        id: 'other_user',
        email: 'new@example.com'
      });

      const result = await emailVerificationService.sendEmailChangeVerification(
        'user_123',
        'old@example.com',
        'new@example.com'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('This email address is already in use');
    });

    it('should prevent duplicate change requests', async () => {
      redis.get.mockImplementation(async (key: string) => {
        if (key.includes('email_change:')) {
          return '1'; // Duplicate exists
        }
        return null;
      });

      const result = await emailVerificationService.sendEmailChangeVerification(
        'user_123',
        'old@example.com',
        'new@example.com'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('already pending');
    });
  });
});