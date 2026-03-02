import React from 'react';
import { render, screen } from '../utils/test-utils';
import userEvent from '@testing-library/user-event';
import LoginForm from '@/ui/styled/auth/LoginForm';
import { describe, it, expect } from 'vitest';

describe('Smoke: Login Form', () => {
  it('renders and accepts user input', async () => {
    render(<LoginForm />);
    const email = screen.getByLabelText(/email/i);
    const password = screen.getByLabelText('Password');
    expect(email).toBeInTheDocument();
    expect(password).toBeInTheDocument();
    await userEvent.type(email, 'test@example.com');
    await userEvent.type(password, 'Password123');
    expect(email).toHaveValue('test@example.com');
    expect(password).toHaveValue('Password123');
  });
}); 