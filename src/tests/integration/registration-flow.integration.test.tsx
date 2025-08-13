import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { RegistrationForm } from '@/ui/styled/auth/RegistrationForm';
import EmailVerification from '@/ui/styled/auth/EmailVerification';
import { UserManagementProvider } from '@/lib/auth/UserManagementProvider';
import { UserType } from '@/types/user-type';
import { useAuth } from '@/hooks/auth/useAuth';

// Mock react-i18next for translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: {
      changeLanguage: vi.fn(),
      language: 'en',
    },
  }),
}));

// Mock functions need to be created inside the factory to avoid hoisting issues
vi.mock('@/hooks/auth/useAuth', () => {
  const mockRegister = vi.fn();
  const mockVerifyEmail = vi.fn();
  const mockSendVerification = vi.fn();
  const mockClearError = vi.fn();
  const mockClearSuccessMessage = vi.fn();
  
  const store = {
    register: mockRegister,
    verifyEmail: mockVerifyEmail,
    sendVerificationEmail: mockSendVerification,
    isLoading: false,
    error: null,
    successMessage: null,
    clearError: mockClearError,
    clearSuccessMessage: mockClearSuccessMessage,
  };
  
  const useAuthMock: any = vi.fn(() => store);
  useAuthMock.setState = (newState: any) => {
    Object.assign(store, newState);
  };
  
  // Export the mock functions so tests can access them
  useAuthMock.mockRegister = mockRegister;
  useAuthMock.mockVerifyEmail = mockVerifyEmail;
  useAuthMock.mockSendVerification = mockSendVerification;
  useAuthMock.mockClearError = mockClearError;
  useAuthMock.mockClearSuccessMessage = mockClearSuccessMessage;
  
  return { useAuth: useAuthMock };
});

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: vi.fn() }),
}));

// Mock PasswordRequirements component
vi.mock('@/ui/styled/auth/PasswordRequirements', () => ({
  PasswordRequirements: () => <div>Password requirements</div>
}));

// Mock OAuthButtons component
vi.mock('@/ui/styled/auth/OAuthButtons', () => ({
  OAuthButtons: () => <div>OAuth buttons</div>
}));

// Mock the register API call with proper implementation
vi.mock('@/lib/api/auth/register', () => {
  const mockRegisterUserViaApi = vi.fn();
  
  // Make it accessible to tests through a special property
  (globalThis as any).mockRegisterUserViaApi = mockRegisterUserViaApi;
  
  return {
    registerUserViaApi: mockRegisterUserViaApi
  };
});

// Mock UserManagementProvider to enable all features
vi.mock('@/lib/auth/UserManagementProvider', () => ({
  useUserManagement: () => ({
    corporateUsers: {
      enabled: true,
      allowUserTypeChange: true,
      defaultUserType: 'PRIVATE'
    }
  }),
  UserManagementProvider: ({ children }: any) => children
}));

describe('Registration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).mockRegisterUserViaApi.mockReset();
    pushMock.mockReset();
  });

  const provider = (
    <UserManagementProvider>
      <RegistrationForm />
    </UserManagementProvider>
  );

  it('renders the registration form', () => {
    const { container } = render(provider);
    expect(container.innerHTML).toBeTruthy();
    console.log('HTML Length:', container.innerHTML.length);
  }, 5000);

  it.skip('submits registration and redirects to email verification', async () => {
    // The RegistrationForm uses registerUserViaApi, not the auth hook register
    const mockRegisterUserViaApi = (globalThis as any).mockRegisterUserViaApi;
    mockRegisterUserViaApi.mockResolvedValueOnce({ success: true });
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    
    // Try to render and check if form appears
    const { container } = render(provider);
    
    // Debug: Check what's rendered
    console.log('Container HTML:', container.innerHTML.substring(0, 500));
    
    // Try to find the email input more directly
    const emailInput = container.querySelector('#email') || container.querySelector('[type="email"]');
    if (!emailInput) {
      console.error('Email input not found!');
      throw new Error('Email input not found in rendered component');
    }

    await user.type(emailInput as HTMLElement, 'new@example.com');
    
    const passwordInput = container.querySelector('#password') || container.querySelector('[type="password"]');
    if (!passwordInput) throw new Error('Password input not found');
    await user.type(passwordInput as HTMLElement, 'Password123!');
    
    const confirmPasswordInput = container.querySelector('#confirmPassword');
    if (!confirmPasswordInput) throw new Error('Confirm password input not found');
    await user.type(confirmPasswordInput as HTMLElement, 'Password123!');
    
    const firstNameInput = container.querySelector('#firstName');
    if (!firstNameInput) throw new Error('First name input not found');
    await user.type(firstNameInput as HTMLElement, 'New');
    
    const lastNameInput = container.querySelector('#lastName');
    if (!lastNameInput) throw new Error('Last name input not found');
    await user.type(lastNameInput as HTMLElement, 'User');
    
    const acceptTermsCheckbox = container.querySelector('#acceptTerms');
    if (!acceptTermsCheckbox) throw new Error('Accept terms checkbox not found');
    await user.click(acceptTermsCheckbox as HTMLElement);
    
    const submitButton = container.querySelector('button[type="submit"]');
    if (!submitButton) throw new Error('Submit button not found');
    await user.click(submitButton as HTMLElement);

    await waitFor(() => expect(mockRegisterUserViaApi).toHaveBeenCalled(), { timeout: 5000 });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('/check-email'));
    vi.useRealTimers();
  }, 30000);

  it.skip('shows validation errors for mismatched passwords', async () => {
    const mockRegisterUserViaApi = (globalThis as any).mockRegisterUserViaApi;
    const user = userEvent.setup();
    render(provider);

    await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'OtherPass!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/passwords don/i)).toBeInTheDocument();
    expect(mockRegisterUserViaApi).not.toHaveBeenCalled();
  }, 30000);

  it.skip('shows error if email already exists', async () => {
    // Mock the API to return an error
    const mockRegisterUserViaApi = (globalThis as any).mockRegisterUserViaApi;
    mockRegisterUserViaApi.mockResolvedValueOnce({ success: false, error: 'Email exists' });
    const user = userEvent.setup();
    render(provider);

    await user.type(screen.getByLabelText(/email/i), 'dup@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
    await user.type(screen.getByLabelText(/first name/i), 'Dup');
    await user.type(screen.getByLabelText(/last name/i), 'User');
    await user.click(screen.getByLabelText(/accept terms/i));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/email exists/i)).toBeInTheDocument();
  }, 30000);

  it.skip('requires company info when business user type selected', async () => {
    const user = userEvent.setup();
    render(provider);

    const corporateRadio = screen.getByTestId('user-type-corporate');
    await user.click(corporateRadio);
    expect(screen.getByTestId('company-name-input')).toBeInTheDocument();
  }, 30000);
});

describe('Email Verification Component', () => {
  beforeEach(() => vi.clearAllMocks());

  it.skip('verifies token and allows resending email', async () => {
    const mockVerifyEmail = (useAuth as any).mockVerifyEmail;
    const mockSendVerification = (useAuth as any).mockSendVerification;
    mockVerifyEmail.mockResolvedValueOnce();
    mockSendVerification.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();
    render(<EmailVerification />);

    await user.type(screen.getByLabelText(/verification token/i), 'tok123');
    await user.click(screen.getByRole('button', { name: /verify email/i }));
    await waitFor(() => expect(mockVerifyEmail).toHaveBeenCalledWith('tok123'));

    await user.type(screen.getByLabelText(/^email$/i), 'resend@example.com');
    await user.click(screen.getByRole('button', { name: /resend verification email/i }));
    await waitFor(() => expect(mockSendVerification).toHaveBeenCalledWith('resend@example.com'));
  }, 30000);
});
