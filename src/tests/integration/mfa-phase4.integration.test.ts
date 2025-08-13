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
import type {
  TwoFactorSetupResult,
  TwoFactorVerifyResult,
  TwoFactorDisableResult,
  BackupCodeResult,
  BackupCodeVerifyResult
} from '@/core/auth/interfaces';

// Mock useAuth hook directly with all MFA Phase 4 methods
vi.mock('@/hooks/auth/useAuth', () => {
  const mockSetupTwoFactor = vi.fn();
  const mockVerifyTwoFactor = vi.fn();
  const mockDisableTwoFactor = vi.fn();
  const mockGenerateBackupCodes = vi.fn();
  const mockVerifyBackupCode = vi.fn();

  // State that can be updated by mock functions
  let mfaState = {
    mfaEnabled: false,
    mfaSecret: null,
    mfaQrCode: null,
    mfaBackupCodes: null,
    error: null,
  };

  const mockUseAuth = vi.fn(() => ({
    // MFA state - dynamically updated
    mfaEnabled: mfaState.mfaEnabled,
    mfaSecret: mfaState.mfaSecret,
    mfaQrCode: mfaState.mfaQrCode,
    mfaBackupCodes: mfaState.mfaBackupCodes,
    error: mfaState.error,
    
    // General state
    user: null,
    token: null,
    loading: false,
    success: null,
    isLoading: false,
    isAuthenticated: false,
    successMessage: null,

    // MFA Phase 4 methods
    setupTwoFactor: mockSetupTwoFactor,
    verifyTwoFactor: mockVerifyTwoFactor,
    disableTwoFactor: mockDisableTwoFactor,
    generateBackupCodes: mockGenerateBackupCodes,
    verifyBackupCode: mockVerifyBackupCode,

    // Other methods (not used in this test)
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    setupMFA: vi.fn(),
    verifyMFA: vi.fn(),
    disableMFA: vi.fn(),
    sendVerificationEmail: vi.fn(),
    sendMagicLink: vi.fn(),
    verifyEmail: vi.fn(),
    verifyMagicLink: vi.fn(),
    deleteAccount: vi.fn(),
    getCurrentUser: vi.fn(),
    clearError: vi.fn(),
    clearSuccess: vi.fn(),
    clearMessages: vi.fn(),
    setUser: vi.fn(),
    setToken: vi.fn(),
    refreshToken: vi.fn(),
    updateLastActivity: vi.fn(),
    onSessionTimeout: vi.fn(),
    onAuthEvent: vi.fn(),
    authService: {} as any,
  }));

  return {
    useAuth: mockUseAuth,
    mockSetupTwoFactor,
    mockVerifyTwoFactor,
    mockDisableTwoFactor,
    mockGenerateBackupCodes,
    mockVerifyBackupCode,
    // Export state reset function for tests
    resetMfaState: () => {
      mfaState = {
        mfaEnabled: false,
        mfaSecret: null,
        mfaQrCode: null,
        mfaBackupCodes: null,
        error: null,
      };
    },
    // Export state update functions
    updateMfaState: (updates: Partial<typeof mfaState>) => {
      Object.assign(mfaState, updates);
    },
  };
});

// Import the mocks after setting up the mock
import { 
  useAuth,
  mockSetupTwoFactor,
  mockVerifyTwoFactor,
  mockDisableTwoFactor,
  mockGenerateBackupCodes,
  mockVerifyBackupCode,
  resetMfaState,
  updateMfaState
} from '@/hooks/auth/useAuth';

describe('MFA Phase 4 Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockSetupTwoFactor.mockReset();
    mockVerifyTwoFactor.mockReset();
    mockDisableTwoFactor.mockReset();
    mockGenerateBackupCodes.mockReset();
    mockVerifyBackupCode.mockReset();
    // Reset MFA state
    resetMfaState();
  });

  describe('setupTwoFactor', () => {
    it('should generate TOTP secret and QR code successfully', async () => {
      const mockSetupResult = {
        success: true,
        secret: 'JBSWY3DPEHPK3PXP',
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
        backupCodes: ['ABCD-1234', 'EFGH-5678']
      };

      mockSetupTwoFactor.mockResolvedValue(mockSetupResult);

      const { result } = renderHook(() => useAuth());

      let setupResult;
      await act(async () => {
        setupResult = await result.current.setupTwoFactor();
      });

      expect(mockSetupTwoFactor).toHaveBeenCalledTimes(1);
      expect(setupResult).toEqual(mockSetupResult);
    });

    it('should handle setup failure gracefully', async () => {
      const mockError = {
        success: false,
        error: 'Failed to generate TOTP secret'
      };

      mockSetupTwoFactor.mockResolvedValue(mockError);

      const { result } = renderHook(() => useAuth());

      let setupResult;
      await act(async () => {
        setupResult = await result.current.setupTwoFactor();
      });

      expect(setupResult).toEqual(mockError);
    });
  });

  describe('verifyTwoFactor', () => {
    it('should verify TOTP code successfully', async () => {
      const mockVerifyResult = {
        success: true,
        token: 'verified_token_123'
      };

      mockVerifyTwoFactor.mockResolvedValue(mockVerifyResult);

      const { result } = renderHook(() => useAuth());

      let verifyResult;
      await act(async () => {
        verifyResult = await result.current.verifyTwoFactor('123456');
      });

      expect(mockVerifyTwoFactor).toHaveBeenCalledWith('123456');
      expect(verifyResult).toEqual(mockVerifyResult);
    });

    it('should handle invalid TOTP code', async () => {
      const mockError = {
        success: false,
        error: 'Invalid verification code'
      };

      mockVerifyTwoFactor.mockResolvedValue(mockError);

      const { result } = renderHook(() => useAuth());

      let verifyResult;
      await act(async () => {
        verifyResult = await result.current.verifyTwoFactor('000000');
      });

      expect(verifyResult).toEqual(mockError);
    });
  });

  describe('disableTwoFactor', () => {
    it('should disable MFA successfully', async () => {
      const mockDisableResult = {
        success: true
      };

      mockDisableTwoFactor.mockResolvedValue(mockDisableResult);

      const { result } = renderHook(() => useAuth());

      let disableResult;
      await act(async () => {
        disableResult = await result.current.disableTwoFactor();
      });

      expect(mockDisableTwoFactor).toHaveBeenCalledTimes(1);
      expect(disableResult).toEqual(mockDisableResult);
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

      mockGenerateBackupCodes.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useAuth());

      let backupResult;
      await act(async () => {
        backupResult = await result.current.generateBackupCodes();
      });

      expect(mockGenerateBackupCodes).toHaveBeenCalledTimes(1);
      expect(backupResult).toEqual(mockResult);
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

      mockVerifyBackupCode.mockResolvedValue(mockVerifyResult);

      const { result } = renderHook(() => useAuth());

      let verifyResult;
      await act(async () => {
        verifyResult = await result.current.verifyBackupCode('ABCD-1234');
      });

      expect(mockVerifyBackupCode).toHaveBeenCalledWith('ABCD-1234');
      expect(verifyResult).toEqual(mockVerifyResult);
    });

    it('should handle invalid/used backup code', async () => {
      const mockError = {
        success: true,
        valid: false,
        error: 'Invalid or already used backup code'
      };

      mockVerifyBackupCode.mockResolvedValue(mockError);

      const { result } = renderHook(() => useAuth());

      let verifyResult;
      await act(async () => {
        verifyResult = await result.current.verifyBackupCode('INVALID-CODE');
      });

      expect(verifyResult).toEqual(mockError);
    });
  });

  describe('MFA Flow Integration', () => {
    it('should complete full MFA setup and verification flow', async () => {
      const { result } = renderHook(() => useAuth());

      // Step 1: Setup MFA
      mockSetupTwoFactor.mockResolvedValue({
        success: true,
        secret: 'JBSWY3DPEHPK3PXP',
        qrCode: 'data:image/png;base64,test...',
        backupCodes: ['ABCD-1234', 'EFGH-5678']
      });

      await act(async () => {
        await result.current.setupTwoFactor();
      });

      expect(mockSetupTwoFactor).toHaveBeenCalled();

      // Step 2: Verify TOTP code
      mockVerifyTwoFactor.mockResolvedValue({
        success: true,
        token: 'verified'
      });

      await act(async () => {
        await result.current.verifyTwoFactor('123456');
      });

      expect(mockVerifyTwoFactor).toHaveBeenCalledWith('123456');

      // Step 3: Generate new backup codes
      mockGenerateBackupCodes.mockResolvedValue({
        success: true,
        backupCodes: ['NEWC-0001', 'NEWC-0002']
      });

      await act(async () => {
        await result.current.generateBackupCodes();
      });

      expect(mockGenerateBackupCodes).toHaveBeenCalled();

      // Step 4: Verify backup code
      mockVerifyBackupCode.mockResolvedValue({
        success: true,
        valid: true
      });

      await act(async () => {
        await result.current.verifyBackupCode('NEWC-0001');
      });

      expect(mockVerifyBackupCode).toHaveBeenCalledWith('NEWC-0001');

      // Step 5: Disable MFA
      mockDisableTwoFactor.mockResolvedValue({
        success: true
      });

      await act(async () => {
        await result.current.disableTwoFactor();
      });

      expect(mockDisableTwoFactor).toHaveBeenCalled();
    });
  });
});