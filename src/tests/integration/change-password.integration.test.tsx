import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@/tests/i18nTestSetup';

vi.mock('@/hooks/auth/useAuth', () => {
  return {
    useAuth: vi.fn(() => ({
      updatePassword: vi.fn(),
      isLoading: false,
      error: null,
      successMessage: null,
      clearError: vi.fn(),
      clearSuccessMessage: vi.fn(),
    }))
  };
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { ChangePasswordForm } from '@/ui/styled/auth/ChangePasswordForm';
import { useAuth } from '@/hooks/auth/useAuth';

const mockUpdatePassword = vi.fn();

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      updatePassword: mockUpdatePassword,
      isLoading: false,
      error: null,
      successMessage: null,
      clearError: vi.fn(),
      clearSuccessMessage: vi.fn(),
    });
  });

  it('submits with valid data and shows success message', async () => {
    mockUpdatePassword.mockResolvedValueOnce({ success: true, message: 'ok' });
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await user.type(screen.getByLabelText(/current password/i), 'OldPass1!');
    await user.type(screen.getByLabelText(/^new password$/i), 'NewPass1!');
    await user.type(screen.getByLabelText(/confirm new password/i), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => expect(mockUpdatePassword).toHaveBeenCalled());
    // Check that success alert is shown (containing "ok" message)
    const successAlert = screen.getByRole('alert');
    expect(successAlert).toBeInTheDocument();
    expect(successAlert).toHaveTextContent('ok');
  });

  it('shows validation errors for weak passwords and mismatched confirm', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await user.type(screen.getByLabelText(/current password/i), 'old');
    await user.type(screen.getByLabelText(/^new password$/i), 'weak');
    await user.type(screen.getByLabelText(/confirm new password/i), 'different');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(await screen.findByText(/new passwords do not match/i)).toBeInTheDocument();
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('displays password strength helper as user types', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    const newPassword = screen.getByLabelText(/^new password$/i);
    await user.type(newPassword, 'Short1');

    const helper = screen.getByTestId('password-requirements-helper');
    expect(helper).toBeInTheDocument();
    
    // Check for the requirement item by its test id
    const lengthRequirement = screen.getByTestId('password-requirement-password-must-be-at-least-8-characters');
    expect(lengthRequirement).toBeInTheDocument();
    expect(lengthRequirement).toHaveAttribute('data-met', 'false');
  });
});
