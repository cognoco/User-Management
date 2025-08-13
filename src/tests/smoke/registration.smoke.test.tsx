import React from 'react';
import { render, screen } from '../utils/test-utils';
import userEvent from '@testing-library/user-event';
import { RegistrationForm } from '@/ui/styled/auth/RegistrationForm';
import { describe, it, expect } from 'vitest';

describe('Smoke: Registration Form', () => {
  it('renders and accepts user input', async () => {
    render(<RegistrationForm />);
    const email = screen.getByLabelText(/email/i);
    const password = screen.getByLabelText(/^password$/i);
    const confirmPassword = screen.getByLabelText(/confirm password/i);
    const firstName = screen.getByLabelText(/first name/i);
    const lastName = screen.getByLabelText(/last name/i);
    const acceptTerms = screen.getByRole('checkbox');
    expect(email).toBeInTheDocument();
    expect(password).toBeInTheDocument();
    expect(confirmPassword).toBeInTheDocument();
    expect(firstName).toBeInTheDocument();
    expect(lastName).toBeInTheDocument();
    expect(acceptTerms).toBeInTheDocument();
    await userEvent.type(email, 'test@example.com');
    await userEvent.type(password, 'Password123');
    await userEvent.type(confirmPassword, 'Password123');
    await userEvent.type(firstName, 'Test');
    await userEvent.type(lastName, 'User');
    await userEvent.click(acceptTerms);
    expect(email).toHaveValue('test@example.com');
    expect(password).toHaveValue('Password123');
    expect(confirmPassword).toHaveValue('Password123');
    expect(firstName).toHaveValue('Test');
    expect(lastName).toHaveValue('User');
    expect(acceptTerms).toBeChecked();
  });
}); 