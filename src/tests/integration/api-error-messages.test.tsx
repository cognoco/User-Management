// __tests__/integration/api-error-messages.test.js

vi.mock('@/lib/database/supabase');
import { supabase } from '@/lib/database/supabase';

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '@/ui/styled/auth/LoginForm';

describe('API Error Messages', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
  });

  test('displays user-friendly error messages for common API errors', async () => {
    // Render login form
    render(<LoginForm />);
    
    // Enter login credentials
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
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
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      // Verify user-friendly error message is displayed
      await waitFor(async () => {
        expect(screen.getByText(scenario.expectedMessage)).toBeInTheDocument();
      });
      
      // Clear the form for next scenario
      await user.clear(screen.getByLabelText(/email/i));
      await user.clear(screen.getByLabelText(/password/i));
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
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
      await user.clear(screen.getByLabelText(/password/i));
      
      // Enter invalid data
      await user.type(screen.getByLabelText(/email/i), scenario.input.email);
      await user.type(screen.getByLabelText(/password/i), scenario.input.password);
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      // Verify error message and suggestion are displayed
      await waitFor(() => {
        expect(screen.getByText(scenario.expectedError)).toBeInTheDocument();
        expect(screen.getByText(scenario.expectedSuggestion)).toBeInTheDocument();
      });
    }
  });
  
  test('error messages are accessible to screen readers', async () => {
    // Render login form
    render(<LoginForm />);
    
    // Enter invalid email
    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Verify error message has correct aria attributes
    await waitFor(() => {
      const errorMessage = screen.getByText(/please enter a valid email address/i);
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
    });
    
    // Verify input is marked as invalid
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAttribute('aria-describedby', expect.stringContaining('error'));
  });
  
  test('displays consolidated error messages for multiple issues', async () => {
    // Render form with multiple fields
    // Note: showRegistration is not currently in LoginFormProps but tested for future support
    render(<LoginForm {...{ showRegistration: true } as any} />);
    
    // View registration form
    await user.click(await screen.findByText(/create account/i));
    
    // Submit empty form
    await user.click(screen.getByRole('button', { name: /sign up/i }));
    
    // Verify consolidated error message is displayed
    await waitFor(() => {
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
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');
    
    // Mock login error
    supabase.auth.signInWithPassword = vi.fn().mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid login credentials', code: 'invalid_credentials' }
    });
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Check for recovery options
    await waitFor(() => {
      expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /reset password/i })).toBeInTheDocument();
    });
    
    // Try another error scenario
    await user.clear(screen.getByLabelText(/email/i));
    await user.clear(screen.getByLabelText(/password/i));
    await user.type(screen.getByLabelText(/email/i), 'unverified@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    // Mock verification error
    supabase.auth.signInWithPassword = vi.fn().mockResolvedValueOnce({
      data: null,
      error: { message: 'Email not confirmed', code: 'email_not_confirmed' }
    });
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Check for resend verification option
    await waitFor(() => {
      expect(screen.getByText(/resend verification email/i)).toBeInTheDocument();
    });
  });
  
  test('handles unexpected API errors gracefully', async () => {
    // Render login form
    render(<LoginForm />);
    
    // Enter credentials
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    // Mock unexpected error with no code
    supabase.auth.signInWithPassword = vi.fn().mockResolvedValueOnce({
      data: null,
      error: { message: 'Unknown server error', status: 500 }
    });
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Check for generic error message
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
    
    // Check for error code information for support
    await waitFor(() => {
      expect(screen.getByText(/support reference/i)).toBeInTheDocument();
      expect(screen.getByText(/500/i)).toBeInTheDocument();
    });
  });
});
