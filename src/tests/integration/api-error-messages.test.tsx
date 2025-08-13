// __tests__/integration/api-error-messages.test.tsx
import { vi, describe, beforeEach, test, expect } from 'vitest';
import '@/tests/i18nTestSetup';

vi.mock('@/lib/database/supabase', async () => await import('@/tests/mocks/supabase'));
import { supabase } from '@/lib/database/supabase';

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '@/ui/styled/auth/LoginForm';

describe('API Error Messages', () => {
  let user;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
  });

  test('displays user-friendly error messages for common API errors', async () => {
    // Render login form
    render(<LoginForm />);
    
    // Enter login credentials
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    await user.type(passwordInput, 'password123');
    
    // Test different API error scenarios
    const errorScenarios = [
      {
        apiError: { message: 'Invalid login credentials', code: 'invalid_credentials' },
        expectedMessage: /email or password is incorrect/i
      },
      {
        apiError: { message: 'Email not confirmed', code: 'email_not_confirmed' },
        expectedMessage: /please verify your email/i
      },
      {
        apiError: { message: 'Rate limit exceeded', code: 'rate_limit_exceeded' },
        expectedMessage: /too many login attempts/i
      },
      {
        apiError: { message: 'Network error', code: 'network_error' },
        expectedMessage: /unable to connect to the server/i
      },
      {
        apiError: { message: 'Service unavailable', code: 'service_unavailable' },
        expectedMessage: /service is temporarily unavailable/i
      }
    ];
    
    for (const scenario of errorScenarios) {
      // Mock API error response
      supabase.auth.signInWithPassword = vi.fn().mockResolvedValueOnce({
        data: null,
        error: scenario.apiError
      });
      
      // Submit form - use type=submit to get the correct button
      await user.click(screen.getByRole('button', { name: /^Login$/i }));
      
      // Verify user-friendly error message is displayed
      await waitFor(async () => {
        const element = await screen.findByText(scenario.expectedMessage);
        expect(element).toBeInTheDocument();
      });
      
      // Clear the form for next scenario
      await user.clear(screen.getByLabelText(/email/i));
      await user.clear(screen.getByPlaceholderText(/password/i));
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByPlaceholderText(/password/i), 'password123');
    }
  });
  
  test('provides helpful suggestions for common user errors', async () => {
    // Render login form
    render(<LoginForm />);
    
    // Test form validation errors with suggestions
    const validationScenarios = [
      {
        input: { email: 'not-an-email', password: 'pwd' },
        expectedError: /please enter a valid email address/i,
        expectedSuggestion: /like name@example.com/i
      },
      {
        input: { email: 'test@example.com', password: '123' },
        expectedError: /password is too short/i,
        expectedSuggestion: /at least 8 characters/i
      }
    ];
    
    for (const scenario of validationScenarios) {
      // Clear form
      await user.clear(screen.getByLabelText(/email/i));
      await user.clear(screen.getByPlaceholderText(/password/i));
      
      // Enter invalid data
      await user.type(screen.getByLabelText(/email/i), scenario.input.email);
      await user.type(screen.getByPlaceholderText(/password/i), scenario.input.password);
      
      // Submit form - use type=submit to get the correct button
      await user.click(screen.getByRole('button', { name: /^Login$/i }));
      
      // Verify error message and suggestion are displayed
      expect(await screen.findByText(scenario.expectedError)).toBeInTheDocument();
      expect(await screen.findByText(scenario.expectedSuggestion)).toBeInTheDocument();
    }
  });
  
  test('error messages are accessible to screen readers', async () => {
    // Render login form
    render(<LoginForm />);
    
    // Enter invalid email
    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /^Login$/i }));
    
    // Verify error message has correct aria attributes
    const errorMessage = await screen.findByText(/please enter a valid email address/i);
    expect(errorMessage).toHaveAttribute('role', 'alert');
    expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
    
    // Verify input is marked as invalid
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAttribute('aria-describedby', expect.stringContaining('error'));
  });
  
  test('displays consolidated error messages for multiple issues', async () => {
    // Render form with multiple fields
    render(<LoginForm showRegistration={true} />);
    
    // View registration form
    await user.click(await screen.findByText(/create account/i));
    
    // Submit empty form
    await user.click(screen.getByRole('button', { name: /^Register$/i }));
    
    // Verify consolidated error message is displayed
    await waitFor(async () => {
      const errorSummary = screen.getByRole('alert', { name: /form errors/i });
      expect(errorSummary).toBeInTheDocument();
      expect(errorSummary).toHaveTextContent(/please fix the following issues/i);
      
      // Check for multiple error items
      const errorItems = screen.getAllByRole('listitem');
      expect(errorItems.length).toBeGreaterThan(1);
    });
  });
  
  test('shows recovery options for account-related errors', async () => {
    // Render login form
    render(<LoginForm />);
    
    // Enter credentials
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/password/i), 'wrong-password');
    
    // Mock login error
    supabase.auth.signInWithPassword = vi.fn().mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid login credentials', code: 'invalid_credentials' }
    });
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /^Login$/i }));
    
    // Check for recovery options
    await waitFor(async () => {
      expect(await screen.findByText(/forgot your password/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /reset password/i })).toBeInTheDocument();
    });
    
    // Try another error scenario
    await user.clear(screen.getByLabelText(/email/i));
    await user.clear(screen.getByPlaceholderText(/password/i));
    await user.type(screen.getByLabelText(/email/i), 'unverified@example.com');
    await user.type(screen.getByPlaceholderText(/password/i), 'password123');
    
    // Mock verification error
    supabase.auth.signInWithPassword = vi.fn().mockResolvedValueOnce({
      data: null,
      error: { message: 'Email not confirmed', code: 'email_not_confirmed' }
    });
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /^Login$/i }));
    
    // Check for resend verification option
    await waitFor(async () => {
      expect(await screen.findByText(/resend verification email/i)).toBeInTheDocument();
    });
  });
  
  test('handles unexpected API errors gracefully', async () => {
    // Render login form
    render(<LoginForm />);
    
    // Enter credentials
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/password/i), 'password123');
    
    // Mock unexpected error with no code
    supabase.auth.signInWithPassword = vi.fn().mockResolvedValueOnce({
      data: null,
      error: { message: 'Unknown server error', status: 500 }
    });
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /^Login$/i }));
    
    // Check for generic error message
    await waitFor(async () => {
      expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    });
    
    // Check for error code information for support
    expect(await screen.findByText(/support reference/i)).toBeInTheDocument();
    expect(await screen.findByText(/500/i)).toBeInTheDocument();
  });
});
