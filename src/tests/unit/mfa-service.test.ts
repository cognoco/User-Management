/**
 * Unit Test for MFA Service
 * 
 * Tests the newly implemented MFA service methods
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DefaultMfaService, type MfaDataProvider } from '@/services/auth/mfa-service';

// Mock data provider
const mockDataProvider: MfaDataProvider = {
  getUser: vi.fn(),
  updateUser: vi.fn(),
  getTempTotpSecret: vi.fn(),
  setTempTotpSecret: vi.fn(),
  getTotpSecret: vi.fn(),
  setTotpSecret: vi.fn(),
  enableMfa: vi.fn(),
  getBackupCodes: vi.fn(),
  setBackupCodes: vi.fn(),
  consumeBackupCode: vi.fn(),
};

describe('MFA Service Unit Tests', () => {
  let mfaService: DefaultMfaService;

  beforeEach(() => {
    vi.clearAllMocks();
    mfaService = new DefaultMfaService(mockDataProvider);
  });

  describe('setupTwoFactor', () => {
    it('should generate TOTP secret and QR code successfully', async () => {
      // Mock user data
      mockDataProvider.getUser = vi.fn().mockResolvedValue({
        email: 'test@example.com'
      });
      mockDataProvider.setTempTotpSecret = vi.fn().mockResolvedValue(undefined);

      const result = await mfaService.setupTwoFactor('user123');

      expect(result.success).toBe(true);
      expect(result.secret).toBeTruthy();
      expect(result.qrCode).toBeTruthy();
      expect(result.backupCodes).toHaveLength(10);
      expect(mockDataProvider.setTempTotpSecret).toHaveBeenCalledWith('user123', expect.any(String));
    });

    it('should handle errors gracefully', async () => {
      mockDataProvider.getUser = vi.fn().mockRejectedValue(new Error('User not found'));

      const result = await mfaService.setupTwoFactor('invalid-user');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('verifyTwoFactor', () => {
    it('should verify TOTP code successfully', async () => {
      // Mock temporary secret exists (during setup)
      mockDataProvider.getTempTotpSecret = vi.fn().mockResolvedValue('JBSWY3DPEHPK3PXP');
      mockDataProvider.setTotpSecret = vi.fn().mockResolvedValue(undefined);
      mockDataProvider.enableMfa = vi.fn().mockResolvedValue(undefined);
      mockDataProvider.setTempTotpSecret = vi.fn().mockResolvedValue(undefined);

      // Note: In a real test, we'd need to generate a valid TOTP code
      // For now, we'll mock the authenticator verification
      const { authenticator: originalAuthenticator } = await import('otplib');
      vi.spyOn(originalAuthenticator, 'verify').mockReturnValue(true);

      const result = await mfaService.verifyTwoFactor('user123', '123456');

      expect(result.success).toBe(true);
      expect(mockDataProvider.setTotpSecret).toHaveBeenCalled();
      expect(mockDataProvider.enableMfa).toHaveBeenCalledWith('user123', true);
    });

    it('should reject invalid TOTP code', async () => {
      mockDataProvider.getTempTotpSecret = vi.fn().mockResolvedValue('JBSWY3DPEHPK3PXP');
      
      // Mock invalid code
      const { authenticator: originalAuthenticator } = await import('otplib');
      vi.spyOn(originalAuthenticator, 'verify').mockReturnValue(false);

      const result = await mfaService.verifyTwoFactor('user123', '000000');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid verification code. Please try again.');
    });

    it('should handle missing secret', async () => {
      mockDataProvider.getTempTotpSecret = vi.fn().mockResolvedValue(null);
      mockDataProvider.getTotpSecret = vi.fn().mockResolvedValue(null);

      const result = await mfaService.verifyTwoFactor('user123', '123456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No TOTP setup found. Please start setup first.');
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate 10 unique backup codes', async () => {
      mockDataProvider.setBackupCodes = vi.fn().mockResolvedValue(undefined);

      const result = await mfaService.generateBackupCodes('user123');

      expect(result.success).toBe(true);
      expect(result.backupCodes).toHaveLength(10);
      
      // Verify format: XXXX-XXXX
      result.backupCodes?.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      });

      // Verify all codes are unique
      const codes = result.backupCodes || [];
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify valid backup code and consume it', async () => {
      mockDataProvider.consumeBackupCode = vi.fn().mockResolvedValue(true);

      const result = await mfaService.verifyBackupCode('user123', 'ABCD-1234');

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
      expect(mockDataProvider.consumeBackupCode).toHaveBeenCalledWith('user123', 'ABCD-1234');
    });

    it('should reject invalid backup code', async () => {
      mockDataProvider.consumeBackupCode = vi.fn().mockResolvedValue(false);

      const result = await mfaService.verifyBackupCode('user123', 'INVALID-CODE');

      expect(result.success).toBe(true);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid or already used backup code');
    });
  });

  describe('disableTwoFactor', () => {
    it('should disable MFA successfully', async () => {
      mockDataProvider.setTotpSecret = vi.fn().mockResolvedValue(undefined);
      mockDataProvider.enableMfa = vi.fn().mockResolvedValue(undefined);
      mockDataProvider.setBackupCodes = vi.fn().mockResolvedValue(undefined);

      const result = await mfaService.disableTwoFactor('user123');

      expect(result.success).toBe(true);
      expect(mockDataProvider.setTotpSecret).toHaveBeenCalledWith('user123', '');
      expect(mockDataProvider.enableMfa).toHaveBeenCalledWith('user123', false);
      expect(mockDataProvider.setBackupCodes).toHaveBeenCalledWith('user123', []);
    });
  });
});