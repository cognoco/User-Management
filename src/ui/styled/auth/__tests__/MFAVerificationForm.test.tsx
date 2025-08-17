import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MFAVerificationForm } from '../MFAVerificationForm';

let state: unknown;

vi.mock('../../../headless/auth/MFAVerificationForm', () => ({
  MFAVerificationForm: ({ render, onUseBackupCode }: { render: (state: unknown) => React.ReactNode; onUseBackupCode: unknown }) => {
    state.onUseBackupCode = onUseBackupCode;
    return render(state);
  }
}));

describe('MFAVerificationForm styled component', () => {
  beforeEach(() => {
    state = {
      handleSubmit: vi.fn((e: unknown) => e.preventDefault()),
      verificationCode: '',
      setVerificationCode: vi.fn((v: string) => { state.verificationCode = v; }),
      isSubmitting: false,
      errors: {} as unknown,
      touched: { verificationCode: false },
      handleBlur: vi.fn(),
    };
  });

  it('submits form using headless handler', async () => {
    const user = userEvent.setup();
    render(<MFAVerificationForm sessionId="abc" onSuccess={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('000000'), '123456');
    expect(state.setVerificationCode).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '[i18n:auth.mfa.verifyButton]' }));
    expect(state.handleSubmit).toHaveBeenCalled();
  });

  it('shows error message', () => {
    state.errors.form = 'Invalid';
    render(<MFAVerificationForm sessionId="abc" onSuccess={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid');
  });

  it('toggles backup code input', async () => {
    const user = userEvent.setup();
    render(<MFAVerificationForm sessionId="abc" onSuccess={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: '[i18n:auth.mfa.useBackupCode]' }));
    expect(state.onUseBackupCode).toBeDefined();
  });
});
