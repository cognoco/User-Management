// __tests__/integration/password-reset-flow.test.tsx

// Import necessary modules
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react'; // Import from React instead of react-dom/test-utils

// Mock the auth store first
vi.mock('@/hooks/auth/useAuth', () => {
  // Zustand selector-compatible mock
  const store = {
    resetPassword: vi.fn().mockResolvedValue({ success: true, message: 'Reset email sent' }),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
    error: null,
    successMessage: null,
    clearError: vi.fn(),
    clearSuccessMessage: vi.fn()
  };
  const useAuthMock: any = vi.fn((selector: any) => (typeof selector === 'function' ? selector(store) : store));
  useAuthMock.setState = (newState: any) => {
    Object.assign(store, newState);
  };
  return { useAuth: useAuthMock };
});

// Then mock the Supabase client
vi.mock('@/lib/database/supabase', () => {
  return {
    supabase: {
      auth: {
        resetPasswordForEmail: vi.fn().mockImplementation(async () => ({
          data: {},
          error: null
        })),
        updateUser: vi.fn().mockImplementation(async () => ({
          data: { user: { id: 'user-id' } },
          error: null
        })),
        getSession: vi.fn().mockImplementation(async () => ({
          data: { 
            session: { 
              access_token: 'test-token',
              user: { id: 'user-id' }
            } 
          },
          error: null
        }))
      }
    }
  };
});

// Mock api.post for password reset confirmation
import * as apiModule from '@/lib/api/axios';
const apiPostSpy = vi.spyOn(apiModule.api, 'post');

// Import after mocks
import { useAuth } from '@/hooks/auth/useAuth';

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResetPasswordForm } from '@/ui/styled/auth/ResetPasswordForm';
import ForgotPasswordForm from '@/ui/styled/auth/ForgotPasswordForm';

// Store original window location
const originalLocation = window.location;

describe('Password Reset Flow', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();

    // Mock window.location hash - needed for reset flow
    // Define a mock assign function if needed for other tests
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        hash: '',
        assign: vi.fn(),
      },
      writable: true,
      configurable: true
    });

    // Always reset mocked auth state before each test
    if ((useAuth as any).setState) {
      (useAuth as any).setState({
        resetPassword: vi.fn().mockResolvedValue({ success: true, message: 'Reset email sent' }),
        isLoading: false,
        error: null,
        successMessage: null,
        clearError: vi.fn(),
        clearSuccessMessage: vi.fn()
      });
    }
  });

  afterEach(() => {
    // Restore original window.location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true
    });
  });

  test('User can request password reset', async () => {
    // This test uses ForgotPasswordForm, which handles the initial reset request
    const mockResetPassword = vi.fn().mockResolvedValue({ success: true, message: 'Reset email sent' });
    
    // Update the mock to return our specific function
    if ((useAuth as any).setState) {
      (useAuth as any).setState({
        resetPassword: mockResetPassword,
        isLoading: false,
        error: null,
        successMessage: null,
        clearError: vi.fn(),
        clearSuccessMessage: vi.fn()
      });
    }

    // Render forgot password component
    await act(async () => {
      render(<ForgotPasswordForm />);
    });

    // Debug: check if form is rendered
    if (!screen.queryByLabelText(/email address/i)) {
      // eslint-disable-next-line no-console
      console.log('DEBUG: ForgotPasswordForm did not render email input. DOM:', document.body.innerHTML);
    }

    // Fill in email 
    const emailInput = screen.getByLabelText(/email address/i);
    await act(async () => {
      await user.type(emailInput, 'user@example.com');
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /send reset link/i });
    await act(async () => {
      await user.click(submitButton);
    });

    // Verify our mocked function was called correctly
    expect(mockResetPassword).toHaveBeenCalledWith('user@example.com');

    // After form submission, update the mock to show success message
    if ((useAuth as any).setState) {
      (useAuth as any).setState({
        resetPassword: mockResetPassword,
        isLoading: false,
        error: null,
        successMessage: 'Password reset email sent. Check your inbox.',
        clearError: vi.fn(),
        clearSuccessMessage: vi.fn()
      });
    }

    // Rerender to show success state
    await act(async () => {
      render(<ForgotPasswordForm />);
    });

    // Success message should appear (after resubmitting the form)
    await act(async () => {
      await user.type(emailInput, 'user@example.com');
      await user.click(submitButton);
    });

    // Success message should be displayed
    await waitFor(() => {
      expect(screen.getByText(/request sent/i)).toBeInTheDocument();
    });
  });

  test('User sees error if reset fails', async () => {
    // Set up mock to return error
    const mockResetPassword = vi.fn().mockResolvedValue({ 
      success: false, 
      error: 'Email not found' 
    });
    
    if ((useAuth as any).setState) {
      (useAuth as any).setState({
        resetPassword: mockResetPassword,
        isLoading: false,
        error: 'Email not found',
        successMessage: null,
        clearError: vi.fn(),
        clearSuccessMessage: vi.fn()
      });
    }
    
    // Render forgot password component
    await act(async () => {
      render(<ForgotPasswordForm />);
    });
    // Debug: check if form is rendered
    if (!screen.queryByLabelText(/email address/i)) {
      // eslint-disable-next-line no-console
      console.log('DEBUG: ForgotPasswordForm did not render email input. DOM:', document.body.innerHTML);
    }
    
    // Fill in email
    const emailInput = screen.getByLabelText(/email address/i);
    await act(async () => {
      await user.type(emailInput, 'nonexistent@example.com');
    });
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /send reset link/i });
    await act(async () => {
      await user.click(submitButton);
    });
    
    // Verify our mock function was called
    expect(mockResetPassword).toHaveBeenCalledWith('nonexistent@example.com');
    
    // Error message should be displayed
    await waitFor(() => {
      expect(screen.getByText(/request failed/i)).toBeInTheDocument();
      expect(screen.getByText(/email not found/i)).toBeInTheDocument();
    });
  });

  test('User can set new password after reset', async () => {
    // Mock URL with reset token
    window.location.hash = '#access_token=test-token&type=recovery';
    
    // Mock api.post for password reset confirmation
    apiPostSpy.mockResolvedValueOnce({ data: {}, error: null });
    
    // Render password reset component with token
    await act(async () => {
      render(<ResetPasswordForm token="test-token" />);
    });
    
    // Fill in new password using more specific queries
    const newPasswordInput = screen.getByLabelText('New Password');
    let confirmPasswordInput;
    try {
      confirmPasswordInput = screen.getByLabelText('Confirm Password');
    } catch (e) {
      // Debug output if selector fails
      // eslint-disable-next-line no-console
      console.log('DEBUG: Could not find Confirm Password label. Current DOM:', document.body.innerHTML);
      throw e;
    }
    
    await act(async () => {
      await user.type(newPasswordInput, 'NewPassword123!');
      await user.type(confirmPasswordInput, 'NewPassword123!');
    });
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /reset password/i });
    await act(async () => {
      await user.click(submitButton);
    });
    
    // Verify api.post was called with the right parameters
    expect(apiPostSpy).toHaveBeenCalledWith('/api/auth/reset-password/confirm', {
      token: 'test-token',
      newPassword: 'NewPassword123!'
    });
    
    // Clean up
    window.location.hash = '';
  });

  test('Password validation works on reset', async () => {
    // Mock URL with reset token
    window.location.hash = '#access_token=test-token&type=recovery';
    
    // Mock updatePassword function that we can check if it was called
    const mockUpdatePassword = vi.fn().mockResolvedValue(undefined);
    
    // Set up auth hook mock
    if ((useAuth as any).setState) {
      (useAuth as any).setState({
        updatePassword: mockUpdatePassword,
        isLoading: false,
        error: null
      });
    }
    
    // Render password reset component with token
    await act(async () => {
      render(<ResetPasswordForm token="test-token" />);
    });
    
    // Fill in mismatched passwords
    const newPasswordInput = screen.getByLabelText('New Password');
    let confirmPasswordInput2;
    try {
      confirmPasswordInput2 = screen.getByLabelText('Confirm Password');
    } catch (e) {
      // Debug output if selector fails
      // eslint-disable-next-line no-console
      console.log('DEBUG: Could not find Confirm Password label. Current DOM:', document.body.innerHTML);
      throw e;
    }
    
    await act(async () => {
      await user.type(newPasswordInput, 'Password123!');
      await user.type(confirmPasswordInput2, 'DifferentPassword123!');
    });
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /reset password/i });
    await act(async () => {
      await user.click(submitButton);
    });
    
    // Error should be displayed from the form's validation
    await waitFor(() => {
      expect(screen.getByText(/passwords don('|')t match/i)).toBeInTheDocument();
    });
    
    // Verify that updatePassword was not called due to validation error
    expect(mockUpdatePassword).not.toHaveBeenCalled();
    
    // Clean up
    window.location.hash = '';
  });
});
