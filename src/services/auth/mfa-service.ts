/**
 * Multi-Factor Authentication Service
 * 
 * This service provides MFA functionality including TOTP setup, verification,
 * backup codes generation and verification. It follows the interface-first
 * design principle and delegates to data providers for persistence.
 */

import * as qrcode from 'qrcode';
import crypto from 'crypto';
import { totpValidator } from './totp-validator.service';
import type {
  TwoFactorSetupResult,
  TwoFactorVerifyResult, 
  TwoFactorDisableResult,
  BackupCodeResult,
  BackupCodeVerifyResult
} from '@/core/auth/interfaces';

export interface MfaService {
  setupTwoFactor(userId: string): Promise<TwoFactorSetupResult>;
  verifyTwoFactor(userId: string, code: string): Promise<TwoFactorVerifyResult>;
  disableTwoFactor(userId: string): Promise<TwoFactorDisableResult>;
  generateBackupCodes(userId: string): Promise<BackupCodeResult>;
  verifyBackupCode(userId: string, code: string): Promise<BackupCodeVerifyResult>;
}

export interface MfaDataProvider {
  getUser(userId: string): Promise<any>;
  updateUser(userId: string, data: any): Promise<void>;
  getTempTotpSecret(userId: string): Promise<string | null>;
  setTempTotpSecret(userId: string, secret: string): Promise<void>;
  getTotpSecret(userId: string): Promise<string | null>;
  setTotpSecret(userId: string, secret: string): Promise<void>;
  enableMfa(userId: string, enabled: boolean): Promise<void>;
  getBackupCodes(userId: string): Promise<string[]>;
  setBackupCodes(userId: string, codes: string[]): Promise<void>;
  consumeBackupCode(userId: string, code: string): Promise<boolean>;
}

export class DefaultMfaService implements MfaService {
  constructor(private dataProvider: MfaDataProvider) {}

  async setupTwoFactor(userId: string): Promise<TwoFactorSetupResult> {
    try {
      // Generate TOTP secret
      const secret = authenticator.generateSecret();
      
      // Store temporary secret (not yet enabled)
      await this.dataProvider.setTempTotpSecret(userId, secret);
      
      // Get user info for QR code generation
      const user = await this.dataProvider.getUser(userId);
      const userEmail = user?.email || userId;
      
      // Generate QR code
      const appName = process.env.NEXT_PUBLIC_APP_NAME || 'User Management System';
      const otpAuthUrl = authenticator.keyuri(userEmail, appName, secret);
      const qrCode = await qrcode.toDataURL(otpAuthUrl);
      
      // Generate initial backup codes
      const backupCodes = this.generateBackupCodesInternal();
      
      return {
        success: true,
        secret,
        qrCode,
        backupCodes
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to setup two-factor authentication';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async verifyTwoFactor(userId: string, code: string): Promise<TwoFactorVerifyResult> {
    try {
      // Get temporary secret (during setup) or permanent secret (during login)
      let secret = await this.dataProvider.getTempTotpSecret(userId);
      if (!secret) {
        secret = await this.dataProvider.getTotpSecret(userId);
      }
      
      if (!secret) {
        return {
          success: false,
          error: 'No TOTP setup found. Please start setup first.'
        };
      }
      
      // Verify TOTP code
      const isValid = authenticator.verify({ token: code, secret });
      
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid verification code. Please try again.'
        };
      }
      
      // If this was a setup verification, enable MFA
      const tempSecret = await this.dataProvider.getTempTotpSecret(userId);
      if (tempSecret) {
        await this.dataProvider.setTotpSecret(userId, tempSecret);
        await this.dataProvider.enableMfa(userId, true);
        await this.dataProvider.setTempTotpSecret(userId, ''); // Clear temp secret
      }
      
      return {
        success: true,
        token: 'verified' // Could be an actual session token in real implementation
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify two-factor code';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async disableTwoFactor(userId: string): Promise<TwoFactorDisableResult> {
    try {
      // Clear TOTP secret and disable MFA
      await this.dataProvider.setTotpSecret(userId, '');
      await this.dataProvider.enableMfa(userId, false);
      await this.dataProvider.setBackupCodes(userId, []);
      
      return {
        success: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disable two-factor authentication';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async generateBackupCodes(userId: string): Promise<BackupCodeResult> {
    try {
      const backupCodes = this.generateBackupCodesInternal();
      await this.dataProvider.setBackupCodes(userId, backupCodes);
      
      return {
        success: true,
        backupCodes
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate backup codes';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async verifyBackupCode(userId: string, code: string): Promise<BackupCodeVerifyResult> {
    try {
      const consumed = await this.dataProvider.consumeBackupCode(userId, code);
      
      if (!consumed) {
        return {
          success: true, // Success means operation completed, valid indicates if code was correct
          valid: false,
          error: 'Invalid or already used backup code'
        };
      }
      
      return {
        success: true,
        valid: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify backup code';
      return {
        success: false,
        valid: false,
        error: errorMessage
      };
    }
  }

  /**
   * Generate 10 unique 8-digit backup codes
   * Format: XXXX-XXXX (4-digit hyphenated pairs)
   */
  private generateBackupCodesInternal(count = 10, length = 8): string[] {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const bytes = crypto.randomBytes(length);
      let code = '';
      
      for (let j = 0; j < length; j++) {
        code += chars[bytes[j] % chars.length];
      }
      
      // Format as XXXX-XXXX
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    
    return codes;
  }
}

export default DefaultMfaService;