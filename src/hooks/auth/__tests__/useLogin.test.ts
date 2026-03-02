import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useLogin } from '../useLogin';
import { UserManagementConfiguration } from '@/core/config';
import type { AuthService } from '@/core/auth/interfaces';
import type { LoginPayload } from '@/core/auth/models';

const mockAuthService: AuthService = {
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  isAuthenticated: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
  verifyPasswordResetToken: vi.fn(),
  updatePasswordWithToken: vi.fn(),
  sendVerificationEmail: vi.fn(),
  sendMagicLink: vi.fn(),
  verifyEmail: vi.fn(),
  verifyMagicLink: vi.fn(),
  deleteAccount: vi.fn(),
  getUserAccount: vi.fn(),
  setupMFA: vi.fn(),
  verifyMFA: vi.fn(),
  disableMFA: vi.fn(),
  checkMfaRequirements: vi.fn(),
  verifyMfaCode: vi.fn(),
  resendMfaEmailCode: vi.fn(),
  resendMfaSmsCode: vi.fn(),
  configureOAuthProvider: vi.fn(),
  getOAuthAuthorizationUrl: vi.fn(),
  exchangeOAuthCode: vi.fn(),
  refreshToken: vi.fn(),
  getTokenExpiry: vi.fn(),
  handleSessionTimeout: vi.fn(),
  onAuthStateChanged: vi.fn(),
};

describe('useLogin', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    UserManagementConfiguration.reset();
    UserManagementConfiguration.configureServiceProviders({
      authService: mockAuthService,
    });
  });

  afterEach(() => {
    UserManagementConfiguration.reset();
  });

  it('logs in successfully without MFA', async () => {
    const credentials: LoginPayload = {
      email: 'test@example.com',
      password: 'pass',
      rememberMe: false,
    };
    vi.mocked(mockAuthService.login).mockResolvedValue({ success: true, token: 't' });

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.login(credentials);
    });

    expect(mockAuthService.login).toHaveBeenCalledWith(credentials);
    expect(result.current.successMessage).toBe('Login successful');
    expect(result.current.error).toBeNull();
    expect(result.current.mfaRequired).toBe(false);
  });

  it('handles MFA requirement', async () => {
    const credentials: LoginPayload = { email: 'a@b.com', password: 'x', rememberMe: false };
    vi.mocked(mockAuthService.login).mockResolvedValue({ success: true, requiresMfa: true, token: 'tmp' });

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.login(credentials);
    });

    expect(result.current.mfaRequired).toBe(true);
    expect(result.current.tempAccessToken).toBe('tmp');
  });

  it('resends verification email', async () => {
    vi.mocked(mockAuthService.sendVerificationEmail).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.resendVerificationEmail('a@test.com');
    });

    expect(mockAuthService.sendVerificationEmail).toHaveBeenCalledWith('a@test.com');
    expect(result.current.successMessage).toBe('Verification email sent successfully.');
  });
});
