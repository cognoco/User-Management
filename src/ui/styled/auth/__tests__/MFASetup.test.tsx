import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { MFASetup } from '../MFASetup';

let state: unknown;

vi.mock('../../../headless/auth/MFASetup', () => ({
  MFASetup: ({ render }: { render: (state: unknown) => React.ReactNode }) => render(state)
}));

describe('MFASetup styled component', () => {
  beforeEach(() => {
    state = {
      handleSubmit: vi.fn(),
      verificationCode: '',
      setVerificationCode: vi.fn(),
      selectedMethod: 'totp',
      setSelectedMethod: vi.fn(),
      availableMethods: [{ id: 'totp', name: 'TOTP', description: 'desc' }],
      qrCodeUrl: 'qr.png',
      secretKey: 'SECRET',
      isSubmitting: false,
      isSuccess: false,
      errors: {},
      backupCodes: [],
      handleBackupCodeDownload: vi.fn(),
      handleBackupCodeCopy: vi.fn()
    };
  });

  it('renders setup form when not completed', () => {
    render(<MFASetup />);
    expect(screen.getByText('Select Authentication Method')).toBeInTheDocument();
    expect(screen.getByLabelText('Verification Code')).toBeInTheDocument();
  });

  it('renders success state and handles actions', async () => {
    const user = userEvent.setup();
    state.isSuccess = true;
    state.backupCodes = ['111', '222'];
    render(<MFASetup />);
    expect(screen.getByText('Two-Factor Authentication Enabled')).toBeInTheDocument();
    expect(screen.getByText('111')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /download codes/i }));
    expect(state.handleBackupCodeDownload).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /copy codes/i }));
    expect(state.handleBackupCodeCopy).toHaveBeenCalled();
  });
});
