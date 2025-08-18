import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailVerification } from '../EmailVerification';

let state: unknown;

vi.mock('../../../headless/auth/EmailVerification', () => ({
  default: ({ render }: { render: (state: unknown) => React.ReactNode }) => render(state)
}));

describe('EmailVerification styled component', () => {
  beforeEach(() => {
    state = {
      token: '',
      setToken: vi.fn((v: string) => { state.token = v; }),
      email: '',
      setEmail: vi.fn((v: string) => { state.email = v; }),
      isLoading: false,
      error: null,
      successMessage: null,
      handleVerify: vi.fn((e: React.FormEvent) => e.preventDefault()),
      handleResend: vi.fn((e: React.FormEvent) => e.preventDefault())
    };
  });

  it('calls handlers on form submit', async () => {
    const user = userEvent.setup();
    render(<EmailVerification />);
    await user.type(screen.getByLabelText(/auth\.verificationToken/i), '123');
    expect(state.setToken).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /auth\.verifyEmail/i }));
    expect(state.handleVerify).toHaveBeenCalled();
    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    expect(state.setEmail).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /auth\.resendVerification/i }));
    expect(state.handleResend).toHaveBeenCalled();
  });

  it('shows error message', () => {
    state.error = 'Oops';
    render(<EmailVerification />);
    expect(screen.getByRole('alert')).toHaveTextContent('Oops');
  });
});
