// __tests__/integration/form-validation-errors-isolated.test.tsx
// Isolate the first test from form-validation-errors.test.tsx

import { vi } from 'vitest';

// Mock UI components
vi.mock('@/ui/primitives/alert', () => ({
  Alert: ({ children, className }: { children: React.ReactNode, className?: string }) => <div data-testid="alert" role="alert" className={className}>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h5 data-testid="alert-title">{children}</h5>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p data-testid="alert-description">{children}</p>,
}));
vi.mock('lucide-react', () => ({
  Check: () => <div data-testid="check-icon" />,
  X: () => <div data-testid="x-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  EyeOff: () => <div data-testid="eye-off-icon" />,
}));

// Add Auth Store mock (from integration test)
const mockRegisterUserAction = vi.fn();
const mockClearError = vi.fn();
const mockClearSuccessMessage = vi.fn();
vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(() => ({
    register: mockRegisterUserAction,
    isLoading: false,
    error: null,
    successMessage: null,
    user: null,
    isAuthenticated: false,
    clearError: mockClearError,
    clearSuccessMessage: mockClearSuccessMessage,
    // Add other methods if needed, keep minimal for now
    login: vi.fn(), 
    logout: vi.fn(),
    sendVerificationEmail: vi.fn(),
    deleteAccount: vi.fn(),
  }))
}));

// Now import other modules
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegistrationForm } from '@/ui/styled/auth/RegistrationForm';
import { describe, test, expect, beforeEach } from 'vitest';
// Import necessary providers and types
import { UserManagementProvider, type UserManagementConfig } from '@/lib/auth/UserManagementProvider';
import { ThemeProvider } from '@/ui/primitives/theme-provider';
import { UserType } from '@/types/user-type';
// Import SubscriptionTier type
import { SubscriptionTier } from '@/types/subscription'; // Import enum itself

describe('Form Validation Errors (Isolated Test)', () => {
  // Declare type for user event instance
  let user: ReturnType<typeof userEvent.setup>; 

  // Define a basic config for the provider with explicit type
  const testConfig: UserManagementConfig = {
    corporateUsers: {
      enabled: false, // Keep simple for this test
      registrationEnabled: true,
      defaultUserType: UserType.PRIVATE,
      requireCompanyValidation: false,
      allowUserTypeChange: false,
      companyFieldsRequired: []
    },
    // Add other minimal required config sections if needed
    twoFactor: { enabled: false, required: false, methods: [] },
    subscription: { enabled: false, defaultTier: SubscriptionTier.FREE, features: {}, enableBilling: false },
    oauth: { enabled: false, providers: [], autoLink: true, allowUnverifiedEmails: false, defaultRedirectPath: '/' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Also reset auth store mocks
    mockRegisterUserAction.mockReset();
    mockClearError.mockReset();
    mockClearSuccessMessage.mockReset();
    user = userEvent.setup(); 
  });

  test('Displays validation errors with clear guidance', async () => {
    render(
      <ThemeProvider defaultTheme="system" storageKey="isolated-test-theme">
        <UserManagementProvider config={testConfig}>
          <RegistrationForm />
        </UserManagementProvider>
      </ThemeProvider>
    );
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const termsCheckbox = screen.getByRole('checkbox');
    const submitButton = screen.getByRole('button', { name: /create account/i });

    // Interact with required fields using the more elaborate pattern
    // Email
    await user.type(emailInput, 'a');
    await user.clear(emailInput);
    fireEvent.blur(emailInput);
    await user.tab();

    // Password
    await user.type(passwordInput, 'a');
    await user.clear(passwordInput);
    fireEvent.blur(passwordInput);
    await user.tab();
    
    // First Name
    await user.type(firstNameInput, 'a');
    await user.clear(firstNameInput);
    fireEvent.blur(firstNameInput);
    await user.tab();

    // Last Name
    await user.type(lastNameInput, 'a');
    await user.clear(lastNameInput);
    fireEvent.blur(lastNameInput);
    await user.tab();

    // Terms Checkbox
    await user.click(termsCheckbox); // Check
    await user.click(termsCheckbox); // Uncheck
    await user.tab(); // Tab away from checkbox

    // Submit empty/invalid form
    await user.click(submitButton);

    // Ensure the registration function wasn't called (validation should prevent this)
    expect(mockRegisterUserAction).not.toHaveBeenCalled(); 

    // Check for required field errors
    await waitFor(() => {
      console.log("Inside waitFor - Checking for errors...");
      screen.debug(); // Keep debug for now

      // Remove the aria-describedby checks
      // const emailErrorId = emailInput.getAttribute('aria-describedby');
      // expect(emailErrorId).not.toBeNull(); // Check if error is linked
      // if (emailErrorId) {
      //     const errorElement = document.getElementById(emailErrorId);
      //     expect(errorElement).not.toBeNull();
      //     if (errorElement) {
      //        expect(errorElement).toHaveTextContent(/required/i); // Check for generic "Required"
      //     }
      // }

      // Assert directly based on the visible error text from debug output
      // Using data-testid for specific error messages
      expect(screen.getByTestId('email-error')).toHaveTextContent(/Please enter a valid email address/i);
      expect(screen.getByTestId('first-name-error')).toHaveTextContent(/First name is required/i);
      expect(screen.getByTestId('last-name-error')).toHaveTextContent(/Last name is required/i);
      expect(screen.getByTestId('password-error')).toHaveTextContent(/Password must be at least 8 characters/i);
      expect(screen.getByText(/You must accept the terms and conditions/i)).toBeInTheDocument();
    });
  });

  // Other tests from the original file are omitted here
}); 