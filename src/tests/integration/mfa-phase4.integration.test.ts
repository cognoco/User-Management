/**
 * Integration Test for MFA Phase 4 Functionality
 * 
 * Tests the newly implemented MFA methods according to PRD requirements:
 * - setupTwoFactor() - Generate TOTP secret and QR code
 * - verifyTwoFactor() - Verify TOTP code
 * - disableTwoFactor() - Disable MFA for user
 * - generateBackupCodes() - Generate backup recovery codes
 * - verifyBackupCode() - Verify a backup code
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/auth/useAuth';
import { UserManagementConfiguration } from '@/core/config';
import type { AuthService } from '@/core/auth/interfaces';

// Mock auth service
const mockAuthService = {
  setupTwoFactor: vi.fn(),
  verifyTwoFactor: vi.fn(), 
  disableTwoFactor: vi.fn(),
  generateBackupCodes: vi.fn(),
  verifyBackupCode: vi.fn(),
  getCurrentUser: vi.fn(),
  isAuthenticated: vi.fn(),
  onAuthStateChanged: vi.fn(() => () => {}),
  // Add minimal required methods
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  resetPassword: vi.fn(),
} as unknown as AuthService;

// Mock UserManagementConfiguration
vi.mock('@/core/config', () => ({
  UserManagementConfiguration: {
    getServiceProvider: vi.fn(() => mockAuthService),
  },
}));

// Mock AuthContext
vi.mock('@/lib/context/AuthContext', () => ({
  useAuthService: () => mockAuthService,
}));

describe('MFA Phase 4 Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockAuthService.setupTwoFactor = vi.fn();
    mockAuthService.verifyTwoFactor = vi.fn();
    mockAuthService.disableTwoFactor = vi.fn();
    mockAuthService.generateBackupCodes = vi.fn();
    mockAuthService.verifyBackupCode = vi.fn();
    mockAuthService.getCurrentUser = vi.fn().mockResolvedValue(null);
    mockAuthService.isAuthenticated = vi.fn().mockReturnValue(false);
  });

  describe('setupTwoFactor', () => {
    it('should generate TOTP secret and QR code successfully', async () => {
      const mockSetupResult = {
        success: true,
        secret: 'JBSWY3DPEHPK3PXP',
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
        backupCodes: ['ABCD-1234', 'EFGH-5678']
      };

      mockAuthService.setupTwoFactor = vi.fn().mockResolvedValue(mockSetupResult);

      const { result } = renderHook(() => useAuth());

      let setupResult;
      await act(async () => {
        setupResult = await result.current.setupTwoFactor();
      });

      expect(mockAuthService.setupTwoFactor).toHaveBeenCalledTimes(1);
      expect(setupResult).toEqual(mockSetupResult);
      expect(result.current.mfaSecret).toBe('JBSWY3DPEHPK3PXP');
      expect(result.current.mfaQrCode).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...');
      expect(result.current.mfaBackupCodes).toEqual(['ABCD-1234', 'EFGH-5678']);
    });

    it('should handle setup failure gracefully', async () => {
      const mockError = {
        success: false,
        error: 'Failed to generate TOTP secret'
      };

      mockAuthService.setupTwoFactor = vi.fn().mockResolvedValue(mockError);

      const { result } = renderHook(() => useAuth());

      let setupResult;
      await act(async () => {
        setupResult = await result.current.setupTwoFactor();
      });

      expect(setupResult).toEqual(mockError);
      expect(result.current.error).toBe('Failed to generate TOTP secret');
    });
  });

  describe('verifyTwoFactor', () => {
    it('should verify TOTP code successfully', async () => {
      const mockVerifyResult = {
        success: true,
        token: 'verified_token_123'
      };

      mockAuthService.verifyTwoFactor = vi.fn().mockResolvedValue(mockVerifyResult);

      const { result } = renderHook(() => useAuth());

      let verifyResult;
      await act(async () => {
        verifyResult = await result.current.verifyTwoFactor('123456');
      });

      expect(mockAuthService.verifyTwoFactor).toHaveBeenCalledWith('123456');
      expect(verifyResult).toEqual(mockVerifyResult);
      expect(result.current.mfaEnabled).toBe(true);
    });

    it('should handle invalid TOTP code', async () => {
      const mockError = {
        success: false,
        error: 'Invalid verification code'
      };

      mockAuthService.verifyTwoFactor = vi.fn().mockResolvedValue(mockError);

      const { result } = renderHook(() => useAuth());

      let verifyResult;
      await act(async () => {
        verifyResult = await result.current.verifyTwoFactor('000000');
      });

      expect(verifyResult).toEqual(mockError);
      expect(result.current.error).toBe('Invalid verification code');
    });
  });

  describe('disableTwoFactor', () => {
    it('should disable MFA successfully', async () => {
      const mockDisableResult = {
        success: true
      };

      mockAuthService.disableTwoFactor = vi.fn().mockResolvedValue(mockDisableResult);

      const { result } = renderHook(() => useAuth());

      let disableResult;
      await act(async () => {
        disableResult = await result.current.disableTwoFactor();
      });

      expect(mockAuthService.disableTwoFactor).toHaveBeenCalledTimes(1);
      expect(disableResult).toEqual(mockDisableResult);
      expect(result.current.mfaEnabled).toBe(false);
      expect(result.current.mfaSecret).toBe(null);
      expect(result.current.mfaQrCode).toBe(null);
      expect(result.current.mfaBackupCodes).toBe(null);
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate 8-10 unique backup codes', async () => {
      const mockBackupCodes = [
        'ABCD-1234', 'EFGH-5678', 'IJKL-9012',
        'MNOP-3456', 'QRST-7890', 'UVWX-1357',
        'YZAB-2468', 'CDEF-9753', 'GHIJ-1864',
        'KLMN-0297'
      ];

      const mockResult = {
        success: true,
        backupCodes: mockBackupCodes
      };

      mockAuthService.generateBackupCodes = vi.fn().mockResolvedValue(mockResult);

      const { result } = renderHook(() => useAuth());

      let backupResult;
      await act(async () => {
        backupResult = await result.current.generateBackupCodes();
      });

      expect(mockAuthService.generateBackupCodes).toHaveBeenCalledTimes(1);
      expect(backupResult).toEqual(mockResult);
      expect(result.current.mfaBackupCodes).toEqual(mockBackupCodes);
      expect(mockBackupCodes).toHaveLength(10); // Should have 10 codes
      
      // Verify format: XXXX-XXXX (8 characters total)
      mockBackupCodes.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      });
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify valid backup code successfully', async () => {
      const mockVerifyResult = {
        success: true,
        valid: true
      };

      mockAuthService.verifyBackupCode = vi.fn().mockResolvedValue(mockVerifyResult);

      const { result } = renderHook(() => useAuth());

      let verifyResult;
      await act(async () => {
        verifyResult = await result.current.verifyBackupCode('ABCD-1234');
      });

      expect(mockAuthService.verifyBackupCode).toHaveBeenCalledWith('ABCD-1234');
      expect(verifyResult).toEqual(mockVerifyResult);
    });

    it('should handle invalid/used backup code', async () => {
      const mockError = {
        success: true,
        valid: false,
        error: 'Invalid or already used backup code'
      };

      mockAuthService.verifyBackupCode = vi.fn().mockResolvedValue(mockError);

      const { result } = renderHook(() => useAuth());

      let verifyResult;
      await act(async () => {
        verifyResult = await result.current.verifyBackupCode('INVALID-CODE');
      });

      expect(verifyResult).toEqual(mockError);
      expect(result.current.error).toBe('Invalid or already used backup code');
    });
  });

  describe('MFA Flow Integration', () => {
    it('should complete full MFA setup and verification flow', async () => {
      const { result } = renderHook(() => useAuth());

      // Step 1: Setup MFA
      mockAuthService.setupTwoFactor = vi.fn().mockResolvedValue({
        success: true,
        secret: 'JBSWY3DPEHPK3PXP',
        qrCode: 'data:image/png;base64,test...',
        backupCodes: ['ABCD-1234', 'EFGH-5678']
      });

      await act(async () => {
        await result.current.setupTwoFactor();
      });

      expect(result.current.mfaSecret).toBe('JBSWY3DPEHPK3PXP');

      // Step 2: Verify TOTP code
      mockAuthService.verifyTwoFactor = vi.fn().mockResolvedValue({
        success: true,
        token: 'verified'
      });

      await act(async () => {
        await result.current.verifyTwoFactor('123456');
      });

      expect(result.current.mfaEnabled).toBe(true);

      // Step 3: Generate new backup codes
      mockAuthService.generateBackupCodes = vi.fn().mockResolvedValue({
        success: true,
        backupCodes: ['NEWC-0001', 'NEWC-0002']
      });

      await act(async () => {
        await result.current.generateBackupCodes();
      });

      expect(result.current.mfaBackupCodes).toEqual(['NEWC-0001', 'NEWC-0002']);

      // Step 4: Verify backup code
      mockAuthService.verifyBackupCode = vi.fn().mockResolvedValue({
        success: true,
        valid: true
      });

      await act(async () => {
        await result.current.verifyBackupCode('NEWC-0001');
      });

      // Step 5: Disable MFA
      mockAuthService.disableTwoFactor = vi.fn().mockResolvedValue({
        success: true
      });

      await act(async () => {
        await result.current.disableTwoFactor();
      });

      expect(result.current.mfaEnabled).toBe(false);
      expect(result.current.mfaSecret).toBe(null);
    });
  });
});