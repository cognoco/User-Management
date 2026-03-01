import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock auth hook with stateful functions
const mockLogin = vi.fn();
const mockVerifyMFA = vi.fn();

vi.mock('@/hooks/auth/useAuth', () => {
  const store = {
    login: mockLogin,
    verifyMFA: mockVerifyMFA,
    isLoading: false,
    error: null,
    successMessage: null,
    clearError: vi.fn(),
    clearSuccessMessage: vi.fn(),
  };
  const useAuthMock: any = vi.fn(() => store);
  return { useAuth: useAuthMock };
});

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: vi.fn() }),
}));

import LoginForm from '@/ui/styled/auth/LoginForm';
import { MFAVerificationForm } from '@/ui/styled/auth/MFAVerificationForm';

describe('Login Flow with MFA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows standard email/password login', async () => {
    mockLogin.mockResolvedValueOnce({ success: true, requiresMfa: false });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'Password123!',
        rememberMe: false,
      });
      expect(pushMock).toHaveBeenCalledWith('/dashboard/overview');
    });
  });

  it('prompts for TOTP code when MFA is required and verifies successfully', async () => {
    mockLogin.mockResolvedValueOnce({ success: true, requiresMfa: true, token: 'tmp' });
    mockVerifyMFA.mockResolvedValueOnce({ success: true, user: { id: '1' }, token: 'tok' });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /login/i }));

    // MFA form should appear
    expect(await screen.findByText(/multi-factor authentication/i)).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('000000'), '123456');
    await user.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(mockVerifyMFA).toHaveBeenCalledWith('tmp', '123456');
      expect(pushMock).toHaveBeenCalledWith('/dashboard/overview');
    });
  });

  it('shows error on invalid credentials', async () => {
    mockLogin.mockResolvedValueOnce({ success: false, error: 'Invalid credentials' });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it('displays rate limit feedback when too many attempts occur', async () => {
    mockLogin.mockResolvedValueOnce({
      success: false,
      error: 'Too many attempts',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 30000,
      remainingAttempts: 0,
    });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText(/too many attempts/i)).toBeInTheDocument();
  });
});

// Additional success cases for email and sms MFA verification
describe('MFAVerificationForm standalone', () => {
  beforeEach(() => vi.clearAllMocks());

  it('verifies code via email', async () => {
    mockVerifyMFA.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<MFAVerificationForm sessionId="tmp" mfaMethod="email" onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText('000000'), '654321');
    await user.click(screen.getByRole('button', { name: /verify/i }));
    await waitFor(() => {
      expect(mockVerifyMFA).toHaveBeenCalledWith('tmp', '654321');
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('verifies code via sms', async () => {
    mockVerifyMFA.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<MFAVerificationForm sessionId="tmp" mfaMethod="sms" onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText('000000'), '777777');
    await user.click(screen.getByRole('button', { name: /verify/i }));
    await waitFor(() => {
      expect(mockVerifyMFA).toHaveBeenCalledWith('tmp', '777777');
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
