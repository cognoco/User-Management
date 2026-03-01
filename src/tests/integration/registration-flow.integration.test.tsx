import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { RegistrationForm } from '@/ui/styled/auth/RegistrationForm';
import EmailVerification from '@/ui/styled/auth/EmailVerification';
import { UserManagementProvider } from '@/lib/auth/UserManagementProvider';
import { UserType } from '@/types/user-type';

const mockRegister = vi.fn();
const mockVerifyEmail = vi.fn();
const mockSendVerification = vi.fn();

vi.mock('@/hooks/auth/useAuth', () => {
  const store = {
    register: mockRegister,
    verifyEmail: mockVerifyEmail,
    sendVerificationEmail: mockSendVerification,
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

describe('Registration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const provider = (
    <UserManagementProvider>
      <RegistrationForm />
    </UserManagementProvider>
  );

  it('submits registration and redirects to email verification', async () => {
    mockRegister.mockResolvedValueOnce({ success: true });
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(provider);

    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/^password \*/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
    await user.type(screen.getByLabelText(/first name/i), 'New');
    await user.type(screen.getByLabelText(/last name/i), 'User');
    await user.click(screen.getByLabelText(/accept terms/i));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(mockRegister).toHaveBeenCalled());
    act(() => { vi.advanceTimersByTime(2000); });
    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('/check-email'));
    vi.useRealTimers();
  });

  it('shows validation errors for mismatched passwords', async () => {
    const user = userEvent.setup();
    render(provider);

    await user.type(screen.getByLabelText(/^password \*/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'OtherPass!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/passwords don/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows error if email already exists', async () => {
    mockRegister.mockResolvedValueOnce({ success: false, error: 'Email exists' });
    const user = userEvent.setup();
    render(provider);

    await user.type(screen.getByLabelText(/email/i), 'dup@example.com');
    await user.type(screen.getByLabelText(/^password \*/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
    await user.type(screen.getByLabelText(/first name/i), 'Dup');
    await user.type(screen.getByLabelText(/last name/i), 'User');
    await user.click(screen.getByLabelText(/accept terms/i));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/email exists/i)).toBeInTheDocument();
  });

  it('requires company info when business user type selected', async () => {
    const user = userEvent.setup();
    render(provider);

    const corporateRadio = screen.getByTestId('user-type-corporate');
    await user.click(corporateRadio);
    expect(screen.getByTestId('company-name-input')).toBeInTheDocument();
  });
});

describe('Email Verification Component', () => {
  beforeEach(() => vi.clearAllMocks());

  it('verifies token and allows resending email', async () => {
    mockVerifyEmail.mockResolvedValueOnce(undefined);
    mockSendVerification.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();
    render(<EmailVerification />);

    await user.type(screen.getByLabelText(/verification token/i), 'tok123');
    await user.click(screen.getByRole('button', { name: /verify email/i }));
    await waitFor(() => expect(mockVerifyEmail).toHaveBeenCalledWith('tok123'));

    await user.type(screen.getByLabelText(/^email$/i), 'resend@example.com');
    await user.click(screen.getByRole('button', { name: /resend verification email/i }));
    await waitFor(() => expect(mockSendVerification).toHaveBeenCalledWith('resend@example.com'));
  });
});
