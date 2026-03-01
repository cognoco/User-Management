/**
 * Direct tests for auth.store.ts compatibility layer.
 * Verifies that useAuthStore correctly wraps the useAuth hook
 * and exposes the expected interface.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock the useAuth hook that useAuthStore delegates to
const mockAuth = {
  user: null as any,
  token: null as string | null,
  isLoading: false,
  isAuthenticated: false,
  error: null as string | null,
  success: null as string | null,
  successMessage: null as string | null,
  mfaEnabled: false,
  mfaSecret: null as string | null,
  mfaQrCode: null as string | null,
  mfaBackupCodes: null as string[] | null,
  loading: false,
  login: vi.fn().mockResolvedValue({ success: true, requiresMfa: false, token: 'token123' }),
  register: vi.fn().mockResolvedValue({ success: true }),
  logout: vi.fn().mockResolvedValue(undefined),
  resetPassword: vi.fn().mockResolvedValue({ success: true }),
  updatePassword: vi.fn().mockResolvedValue({ success: true }),
  sendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
  verifyEmail: vi.fn().mockResolvedValue({ success: true }),
  verifyMFA: vi.fn().mockResolvedValue({ success: true }),
  setupMFA: vi.fn().mockResolvedValue({ success: true }),
  deleteAccount: vi.fn().mockResolvedValue({ success: true }),
  clearError: vi.fn(),
  clearSuccess: vi.fn(),
  setUser: vi.fn(),
  setToken: vi.fn(),
  onSessionTimeout: vi.fn(),
  refreshToken: vi.fn().mockResolvedValue(true),
};

vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => mockAuth,
}));

describe('Auth Store Compatibility Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should expose all expected action functions', async () => {
    const { useAuthStore } = await import('../auth.store');
    const { result } = renderHook(() => useAuthStore());
    const state = result.current;

    // Verify all expected functions exist
    expect(typeof state.login).toBe('function');
    expect(typeof state.register).toBe('function');
    expect(typeof state.logout).toBe('function');
    expect(typeof state.resetPassword).toBe('function');
    expect(typeof state.updatePassword).toBe('function');
    expect(typeof state.sendVerificationEmail).toBe('function');
    expect(typeof state.verifyEmail).toBe('function');
    expect(typeof state.clearError).toBe('function');
    expect(typeof state.clearSuccessMessage).toBe('function');
    expect(typeof state.deleteAccount).toBe('function');
    expect(typeof state.setupMFA).toBe('function');
    expect(typeof state.verifyMFA).toBe('function');
    expect(typeof state.refreshToken).toBe('function');
  });

  it('should expose state properties from useAuth', async () => {
    const { useAuthStore } = await import('../auth.store');
    const { result } = renderHook(() => useAuthStore());
    const state = result.current;

    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBeNull();
    expect(state.successMessage).toBeNull();
    expect(state.rateLimitInfo).toBeNull();
    expect(state.mfaEnabled).toBe(false);
    expect(state.mfaSecret).toBeNull();
    expect(state.mfaQrCode).toBeNull();
    expect(state.mfaBackupCodes).toBeNull();
  });

  it('should delegate login calls to useAuth', async () => {
    const { useAuthStore } = await import('../auth.store');
    const { result } = renderHook(() => useAuthStore());

    const loginResult = await result.current.login({ email: 'test@example.com', password: 'password' });

    expect(mockAuth.login).toHaveBeenCalledWith('test@example.com', 'password');
    expect(loginResult).toEqual({ success: true, requiresMfa: false, token: 'token123' });
  });

  it('should delegate logout calls to useAuth', async () => {
    const { useAuthStore } = await import('../auth.store');
    const { result } = renderHook(() => useAuthStore());

    await result.current.logout();

    expect(mockAuth.logout).toHaveBeenCalled();
  });

  it('should delegate register calls to useAuth', async () => {
    const { useAuthStore } = await import('../auth.store');
    const { result } = renderHook(() => useAuthStore());
    const payload = { email: 'new@example.com', password: 'pass123', firstName: 'Test', lastName: 'User' };

    await result.current.register(payload);

    expect(mockAuth.register).toHaveBeenCalledWith(payload);
  });

  it('should delegate clearError and clearSuccessMessage to useAuth', async () => {
    const { useAuthStore } = await import('../auth.store');
    const { result } = renderHook(() => useAuthStore());

    result.current.clearError();
    expect(mockAuth.clearError).toHaveBeenCalled();

    result.current.clearSuccessMessage();
    expect(mockAuth.clearSuccess).toHaveBeenCalled();
  });
});
