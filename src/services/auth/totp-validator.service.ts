/**
 * TOTP Validator Service with Time Drift Compensation
 * 
 * Handles TOTP validation with configurable time windows to account for
 * clock drift between client and server. Prevents replay attacks and
 * supports multiple time windows for better user experience.
 */

import { authenticator, totp } from 'otplib';
import { debug, warn, error as logError } from '@/lib/utils/logger';

/**
 * TOTP validation configuration
 */
export interface TOTPValidationConfig {
  /** Time step in seconds (default: 30) */
  step?: number;
  /** Number of time windows to check before/after current (default: 1) */
  window?: number;
  /** Algorithm to use (default: 'sha1') */
  algorithm?: 'sha1' | 'sha256' | 'sha512';
  /** Number of digits in the code (default: 6) */
  digits?: number;
  /** Grace period in milliseconds for clock drift (default: 90000 = 1.5 minutes) */
  gracePeriod?: number;
}

/**
 * Token usage tracking to prevent replay attacks
 */
interface UsedToken {
  token: string;
  timestamp: number;
  window: number;
}

/**
 * TOTP Validator Service
 */
export class TOTPValidatorService {
  private static instance: TOTPValidatorService;
  private usedTokens = new Map<string, UsedToken[]>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Default configuration
  private readonly defaultConfig: Required<TOTPValidationConfig> = {
    step: 30,
    window: 1, // Check 1 window before and after (total 3 windows)
    algorithm: 'sha1',
    digits: 6,
    gracePeriod: 90000 // 1.5 minutes
  };

  private constructor() {
    // Configure otplib defaults
    authenticator.options = {
      step: this.defaultConfig.step,
      window: this.defaultConfig.window,
      digits: this.defaultConfig.digits,
      algorithm: this.defaultConfig.algorithm
    };

    // Start cleanup interval for used tokens
    this.startCleanup();
  }

  static getInstance(): TOTPValidatorService {
    if (!TOTPValidatorService.instance) {
      TOTPValidatorService.instance = new TOTPValidatorService();
    }
    return TOTPValidatorService.instance;
  }

  /**
   * Validate TOTP token with time drift compensation
   */
  async validateToken(
    secret: string,
    token: string,
    userId: string,
    config: TOTPValidationConfig = {}
  ): Promise<{
    valid: boolean;
    window?: number;
    drift?: number;
    error?: string;
  }> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    
    // Check token format
    if (!this.isValidTokenFormat(token, mergedConfig.digits)) {
      return {
        valid: false,
        error: 'Invalid token format'
      };
    }

    // Check for replay attack
    const userKey = `${userId}:${secret}`;
    if (this.isTokenReused(userKey, token)) {
      warn('totp-validator', `Replay attack detected for user ${userId}`);
      return {
        valid: false,
        error: 'Token already used'
      };
    }

    try {
      // Get current time window
      const now = Date.now();
      const currentWindow = Math.floor(now / 1000 / mergedConfig.step);

      // Check multiple time windows to handle clock drift
      for (let window = -mergedConfig.window; window <= mergedConfig.window; window++) {
        const testWindow = currentWindow + window;
        
        // Generate expected token for this window
        const expectedToken = totp.generate(secret, {
          epoch: testWindow * mergedConfig.step * 1000,
          step: mergedConfig.step,
          digits: mergedConfig.digits,
          algorithm: mergedConfig.algorithm
        });

        if (expectedToken === token) {
          // Token is valid - record usage to prevent replay
          this.recordTokenUsage(userKey, token, now, window);
          
          // Calculate approximate time drift
          const drift = window * mergedConfig.step * 1000;
          
          debug('totp-validator', `Valid token for user ${userId}, window: ${window}, drift: ${drift}ms`);
          
          return {
            valid: true,
            window,
            drift
          };
        }
      }

      // Also check with authenticator library's built-in validation
      // This provides additional validation methods
      const isValidWithAuthenticator = authenticator.verify({
        token,
        secret,
        window: mergedConfig.window
      });

      if (isValidWithAuthenticator) {
        this.recordTokenUsage(userKey, token, now, 0);
        debug('totp-validator', `Valid token (authenticator lib) for user ${userId}`);
        return {
          valid: true,
          window: 0,
          drift: 0
        };
      }

      return {
        valid: false,
        error: 'Invalid token'
      };
    } catch (err) {
      logError('totp-validator', 'Token validation failed', err as Error);
      return {
        valid: false,
        error: 'Validation error'
      };
    }
  }

  /**
   * Generate TOTP secret with enhanced entropy
   */
  generateSecret(length = 32): string {
    // Use authenticator's secure secret generation
    const secret = authenticator.generateSecret(length);
    debug('totp-validator', 'Generated new TOTP secret');
    return secret;
  }

  /**
   * Generate QR code URL for TOTP setup
   */
  generateQRCodeURL(
    secret: string,
    accountName: string,
    issuer: string,
    config: TOTPValidationConfig = {}
  ): string {
    const mergedConfig = { ...this.defaultConfig, ...config };
    
    const otpauth = authenticator.keyuri(
      accountName,
      issuer,
      secret
    );

    // Add additional parameters if not using defaults
    let url = otpauth;
    if (mergedConfig.algorithm !== 'sha1') {
      url += `&algorithm=${mergedConfig.algorithm.toUpperCase()}`;
    }
    if (mergedConfig.digits !== 6) {
      url += `&digits=${mergedConfig.digits}`;
    }
    if (mergedConfig.step !== 30) {
      url += `&period=${mergedConfig.step}`;
    }

    return url;
  }

  /**
   * Check if token format is valid
   */
  private isValidTokenFormat(token: string, digits: number): boolean {
    const regex = new RegExp(`^\\d{${digits}}$`);
    return regex.test(token);
  }

  /**
   * Check if token has been used recently (replay attack prevention)
   */
  private isTokenReused(userKey: string, token: string): boolean {
    const usedTokens = this.usedTokens.get(userKey);
    if (!usedTokens) return false;

    return usedTokens.some(used => used.token === token);
  }

  /**
   * Record token usage to prevent replay attacks
   */
  private recordTokenUsage(
    userKey: string,
    token: string,
    timestamp: number,
    window: number
  ): void {
    const usedTokens = this.usedTokens.get(userKey) || [];
    
    usedTokens.push({
      token,
      timestamp,
      window
    });

    // Keep only recent tokens (last 10 or within grace period)
    const cutoff = timestamp - this.defaultConfig.gracePeriod;
    const recentTokens = usedTokens
      .filter(t => t.timestamp > cutoff)
      .slice(-10); // Keep max 10 tokens

    this.usedTokens.set(userKey, recentTokens);
  }

  /**
   * Clean up old used tokens periodically
   */
  private startCleanup(): void {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupUsedTokens();
    }, 5 * 60 * 1000);
  }

  /**
   * Remove expired tokens from memory
   */
  private cleanupUsedTokens(): void {
    const now = Date.now();
    const cutoff = now - this.defaultConfig.gracePeriod;
    let cleaned = 0;

    for (const [userKey, tokens] of this.usedTokens.entries()) {
      const validTokens = tokens.filter(t => t.timestamp > cutoff);
      
      if (validTokens.length === 0) {
        this.usedTokens.delete(userKey);
        cleaned++;
      } else if (validTokens.length < tokens.length) {
        this.usedTokens.set(userKey, validTokens);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      debug('totp-validator', `Cleaned ${cleaned} expired token entries`);
    }
  }

  /**
   * Get time drift statistics for monitoring
   */
  getTimeDriftStats(): {
    totalValidations: number;
    averageDrift: number;
    maxDrift: number;
    driftDistribution: Record<number, number>;
  } {
    // This would be implemented with actual tracking in production
    return {
      totalValidations: 0,
      averageDrift: 0,
      maxDrift: 0,
      driftDistribution: {}
    };
  }

  /**
   * Validate recovery code (backup code)
   */
  async validateRecoveryCode(
    code: string,
    validCodes: string[],
    userId: string
  ): Promise<{
    valid: boolean;
    remainingCodes?: string[];
    error?: string;
  }> {
    // Normalize code (remove spaces, dashes, make uppercase)
    const normalizedCode = code.replace(/[\s-]/g, '').toUpperCase();
    
    // Check if code exists
    const codeIndex = validCodes.findIndex(
      c => c.replace(/[\s-]/g, '').toUpperCase() === normalizedCode
    );

    if (codeIndex === -1) {
      return {
        valid: false,
        error: 'Invalid recovery code'
      };
    }

    // Remove used code
    const remainingCodes = [...validCodes];
    remainingCodes.splice(codeIndex, 1);

    debug('totp-validator', `Recovery code used for user ${userId}, ${remainingCodes.length} remaining`);

    return {
      valid: true,
      remainingCodes
    };
  }

  /**
   * Cleanup on service destruction
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.usedTokens.clear();
  }
}

// Export singleton instance
export const totpValidator = TOTPValidatorService.getInstance();