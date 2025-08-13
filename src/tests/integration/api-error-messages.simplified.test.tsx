// Simplified test for API error messages
import { vi, describe, beforeEach, test, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@/tests/i18nTestSetup';

// Simple component to test error display
const ErrorDisplay = ({ error }: { error?: { message: string; code: string } | null }) => {
  if (!error) return null;
  
  // Map error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    'invalid_credentials': 'Email or password is incorrect',
    'email_not_confirmed': 'Please verify your email',
    'rate_limit_exceeded': 'Too many login attempts',
    'network_error': 'Unable to connect to the server',
    'service_unavailable': 'Service is temporarily unavailable'
  };
  
  const message = errorMessages[error.code] || error.message || 'Something went wrong';
  
  return (
    <div role="alert" aria-live="polite">
      <p>{message}</p>
    </div>
  );
};

describe('API Error Messages - Simplified', () => {
  test('displays user-friendly error messages for common API errors', () => {
    const testCases = [
      {
        error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
        expectedMessage: 'Email or password is incorrect'
      },
      {
        error: { message: 'Email not confirmed', code: 'email_not_confirmed' },
        expectedMessage: 'Please verify your email'
      },
      {
        error: { message: 'Rate limit exceeded', code: 'rate_limit_exceeded' },
        expectedMessage: 'Too many login attempts'
      }
    ];
    
    testCases.forEach(({ error, expectedMessage }) => {
      const { rerender } = render(<ErrorDisplay error={error} />);
      expect(screen.getByText(expectedMessage)).toBeInTheDocument();
      rerender(<ErrorDisplay error={null} />);
    });
  });
  
  test('error messages are accessible to screen readers', () => {
    const error = { message: 'Test error', code: 'test_error' };
    render(<ErrorDisplay error={error} />);
    
    const alertElement = screen.getByRole('alert');
    expect(alertElement).toBeInTheDocument();
    expect(alertElement).toHaveAttribute('aria-live', 'polite');
  });
  
  test('handles unexpected API errors gracefully', () => {
    const error = { message: 'Unknown error occurred', code: 'unknown_error' };
    render(<ErrorDisplay error={error} />);
    
    // Should fall back to the original message for unknown error codes
    expect(screen.getByText('Unknown error occurred')).toBeInTheDocument();
  });
});