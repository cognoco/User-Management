import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BusinessSSOAuth } from '../BusinessSSOAuth';

let state: unknown;

vi.mock('../../../headless/auth/BusinessSSOAuth', () => ({
  BusinessSSOAuth: ({ children }: { children: (state: unknown) => React.ReactNode }) => children(state)
}));

describe('BusinessSSOAuth styled component', () => {
  beforeEach(() => {
    state = {
      domainValue: '',
      setDomainValue: vi.fn((v: string) => { state.domainValue = v; }),
      handleSubmit: vi.fn((e: React.FormEvent) => e.preventDefault()),
      isSubmitting: false,
      isValid: true,
      errors: {},
      touched: { domain: false },
      handleBlur: vi.fn(),
      availableProviders: [ { id: 'google', name: 'Google', logoUrl: '' } ],
      initiateProviderLogin: vi.fn()
    };
  });

  it('submits domain and initiates provider login', async () => {
    const user = userEvent.setup();
    render(<BusinessSSOAuth domain="" />);
    await user.type(screen.getByLabelText(/auth\.sso\.domain/i), 'example.com');
    expect(state.setDomainValue).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(state.handleSubmit).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Google' }));
    expect(state.initiateProviderLogin).toHaveBeenCalledWith('google');
  });

  it('shows form error', () => {
    state.errors.form = 'Error';
    render(<BusinessSSOAuth domain="" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Error');
  });
});
