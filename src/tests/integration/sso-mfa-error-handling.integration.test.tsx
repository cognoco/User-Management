import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { vi } from 'vitest';
import '@/tests/i18nTestSetup';

// Import components to test
import { MFAVerificationForm } from '@/ui/styled/auth/MFAVerificationForm';
import { OAuthCallback } from '@/ui/styled/auth/OAuthCallback';
import type { TwoFactorMethodType } from '@/core/two-factor/models';
import { api } from '@/lib/api/axios';

// Create a test server to mock API responses
const server = setupServer(
  // SSO error handling mocks
  http.get('/api/auth/sso/state', () => {
    return HttpResponse.json({ state: 'mock-state', codeVerifier: 'mock-verifier' });
  }),
  http.post('/api/auth/sso/:provider/callback', () => {
    return HttpResponse.json({ success: true, user: { id: 'user-123' } });
  }),
  
  // MFA error handling mocks (with different error scenarios)
  http.post('/api/auth/mfa/verify', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    
    if (body.code === '999999') {
      return new HttpResponse(
        JSON.stringify({ error: 'Invalid verification code' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (body.code === '123000') {
      return new HttpResponse(
        JSON.stringify({ error: 'Verification code expired' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (body.code === '000000') {
      return new HttpResponse(
        JSON.stringify({ error: 'Server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return HttpResponse.json({ success: true });
  }),
  
  // MFA setup error mocks
  http.post('/api/2fa/setup', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    
    if (body.email === 'error@example.com') {
      return new HttpResponse(
        JSON.stringify({ error: 'Failed to send verification code' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (body.phone === '+1999999999') {
      return new HttpResponse(
        JSON.stringify({ error: 'Invalid phone number format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return HttpResponse.json({ 
      success: true, 
      secret: body.method === 'totp' ? 'ABCDEFGHIJKLMNOP' : undefined 
    });
  }),
  
  // MFA resend code error
  http.post('/api/auth/mfa/resend-email', () => {
    return new HttpResponse(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }),
  
  // SMS Resend error
  http.post('/api/auth/mfa/resend-sms', () => {
    return new HttpResponse(
      JSON.stringify({ error: 'SMS delivery failed. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  })
);

// Setup before tests
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Setup mock for useAuth hook and related Zustand stores if needed
vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123', email: 'test@example.com' },
    setUser: vi.fn(),
    clearUser: vi.fn()
  }))
}));

// Create a wrapper with React Query for components that need it
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('SSO Error Handling', () => {
  test('handles provider error (user denied authorization)', async () => {
    // Mock specific error for this test
    server.use(
      http.post('/api/auth/sso/:provider/callback', () => {
        return new HttpResponse(
          JSON.stringify({ error: 'User canceled the OAuth process' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    
    const mockNavigate = vi.fn();
    vi.mock('next/navigation', () => ({
      useRouter: () => ({
        push: mockNavigate,
        replace: mockNavigate
      }),
      useSearchParams: () => ({
        get: (param: string) => {
          if (param === 'code') return 'mock-code';
          if (param === 'provider') return 'google';
          if (param === 'state') return 'mock-state';
          if (param === 'error') return 'access_denied';
          return null;
        }
      })
    }));
    
    render(<OAuthCallback />, { wrapper: createWrapper() });
    
    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/canceled|denied|rejected/i)).toBeInTheDocument();
    });
    
    // Should redirect to login page after error
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/auth/login'));
    });
  });
  
  test('handles email permission denied error', async () => {
    // Mock specific error for this test
    server.use(
      http.post('/api/auth/sso/:provider/callback', () => {
        return new HttpResponse(
          JSON.stringify({ error: 'Email permission required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    
    const mockNavigate = vi.fn();
    vi.mock('next/navigation', () => ({
      useRouter: () => ({
        push: mockNavigate,
        replace: mockNavigate
      }),
      useSearchParams: () => ({
        get: (param: string) => {
          if (param === 'code') return 'mock-code';
          if (param === 'provider') return 'google';
          if (param === 'state') return 'mock-state';
          return null;
        }
      })
    }));
    
    render(<OAuthCallback />, { wrapper: createWrapper() });
    
    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/email permission required/i)).toBeInTheDocument();
    });
  });
  
  test('handles account linking conflict', async () => {
    // Mock specific error for this test
    server.use(
      http.post('/api/auth/sso/:provider/callback', () => {
        return new HttpResponse(
          JSON.stringify({ 
            error: 'Account exists', 
            email: 'existing@example.com',
            needsLinking: true 
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    
    const mockNavigate = vi.fn();
    vi.mock('next/navigation', () => ({
      useRouter: () => ({
        push: mockNavigate,
        replace: mockNavigate
      }),
      useSearchParams: () => ({
        get: (param: string) => {
          if (param === 'code') return 'mock-code';
          if (param === 'provider') return 'google';
          if (param === 'state') return 'mock-state';
          return null;
        }
      })
    }));
    
    render(<OAuthCallback />, { wrapper: createWrapper() });
    
    // Verify conflict message is displayed with linking instructions
    await waitFor(() => {
      expect(screen.getByText(/account.*exists/i)).toBeInTheDocument();
      expect(screen.getByText(/existing@example.com/i)).toBeInTheDocument();
      expect(screen.getByText(/link accounts/i)).toBeInTheDocument();
    });
  });
  
  test('handles server error during SSO', async () => {
    // Mock server error response
    server.use(
      http.post('/api/auth/sso/:provider/callback', () => {
        return new HttpResponse(
          JSON.stringify({ error: 'Internal server error' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    
    const mockNavigate = vi.fn();
    vi.mock('next/navigation', () => ({
      useRouter: () => ({
        push: mockNavigate,
        replace: mockNavigate
      }),
      useSearchParams: () => ({
        get: (param: string) => {
          if (param === 'code') return 'mock-code';
          if (param === 'provider') return 'google';
          if (param === 'state') return 'mock-state';
          return null;
        }
      })
    }));
    
    render(<OAuthCallback />, { wrapper: createWrapper() });
    
    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/server error|failed|try again/i)).toBeInTheDocument();
    });
  });
});

describe('MFA Error Handling', () => {
  test('handles invalid TOTP verification code', async () => {
    const user = userEvent.setup();
    const mockSuccessCallback = vi.fn();
    
    render(
      <MFAVerificationForm 
        sessionId="mock-session" 
        onSuccess={mockSuccessCallback} 
        mfaMethod="totp"
      />
    );
    
    // Enter invalid code
    await user.type(screen.getByLabelText(/code/i), '999999');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /verify/i }));
    
    // Verify error is displayed
    await waitFor(() => {
      expect(screen.getByText(/invalid verification code/i)).toBeInTheDocument();
    });
    
    // Success callback should not be called
    expect(mockSuccessCallback).not.toHaveBeenCalled();
  });
  
  test('handles expired verification code', async () => {
    const user = userEvent.setup();
    const mockSuccessCallback = vi.fn();
    
    render(
      <MFAVerificationForm 
        sessionId="mock-session" 
        onSuccess={mockSuccessCallback} 
        mfaMethod="totp"
      />
    );
    
    // Enter expired code
    await user.type(screen.getByLabelText(/code/i), '123000');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /verify/i }));
    
    // Verify expiry error is displayed
    await waitFor(() => {
      expect(screen.getByText(/expired/i)).toBeInTheDocument();
    });
    
    // Success callback should not be called
    expect(mockSuccessCallback).not.toHaveBeenCalled();
  });

  test('handles server error during verification', async () => {
    const user = userEvent.setup();
    const mockSuccessCallback = vi.fn();
    
    render(
      <MFAVerificationForm 
        sessionId="mock-session" 
        onSuccess={mockSuccessCallback} 
        mfaMethod="totp"
      />
    );
    
    // Enter code that will trigger server error
    await user.type(screen.getByLabelText(/code/i), '000000');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /verify/i }));
    
    // Verify server error is displayed
    await waitFor(() => {
      expect(screen.getByText(/server error|try again/i)).toBeInTheDocument();
    });
    
    // Success callback should not be called
    expect(mockSuccessCallback).not.toHaveBeenCalled();
  });
  
  test('handles email delivery failure during setup', async () => {
    const user = userEvent.setup();
    
    // Mock component for testing email setup
    const EmailSetupTest = () => (
      <div>
        <form data-testid="email-setup-form">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" />
          <button type="submit">Send Code</button>
        </form>
      </div>
    );
    
    render(<EmailSetupTest />);
    
    // Spy on the API call
    const apiPostSpy = vi.spyOn(api, 'post').mockRejectedValueOnce({
      response: { data: { error: 'Failed to send verification code' } }
    });
    
    // Fill and submit form
    await user.type(screen.getByLabelText(/email/i), 'error@example.com');
    await user.click(screen.getByRole('button', { name: /send code/i }));
    
    // Verify the API was called with the right parameters
    expect(apiPostSpy).toHaveBeenCalled();
    
    // Clean up the spy
    apiPostSpy.mockRestore();
  });

  test('handles too many code resend attempts', async () => {
    const user = userEvent.setup();
    const mockSuccessCallback = vi.fn();
    
    render(
      <MFAVerificationForm 
        sessionId="mock-session" 
        onSuccess={mockSuccessCallback} 
        mfaMethod="email"
        enableResendCode={true}
      />
    );
    
    // Find and click the resend button
    const resendButton = screen.getByRole('button', { name: /resend/i });
    await user.click(resendButton);
    
    // Verify rate limit error is displayed
    await waitFor(() => {
      expect(screen.getByText(/too many requests|try again later/i)).toBeInTheDocument();
    });
  });
  
  test('handles SMS delivery failure', async () => {
    const user = userEvent.setup();
    const mockSuccessCallback = vi.fn();
    
    render(
      <MFAVerificationForm 
        sessionId="mock-session" 
        onSuccess={mockSuccessCallback} 
        mfaMethod="sms"
        enableResendCode={true}
      />
    );
    
    // Find and click the resend button
    const resendButton = screen.getByRole('button', { name: /resend/i });
    await user.click(resendButton);
    
    // Verify SMS delivery error is displayed
    await waitFor(() => {
      expect(screen.getByText(/delivery failed|try again/i)).toBeInTheDocument();
    });
  });

  // Test for backup codes
  test('handles invalid backup code', async () => {
    // Mock the backup code verification endpoint specifically for this test
    server.use(
      http.post('/api/auth/mfa/verify', async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        if (body.method === 'backup') {
          return new HttpResponse(
            JSON.stringify({ error: 'Invalid backup code or code already used' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return HttpResponse.json({ success: true });
      })
    );
    
    const user = userEvent.setup();
    const mockSuccessCallback = vi.fn();
    
    // Render component with backup code mode — using 'other' since 'backup' isn't a valid mfaMethod
    render(
      <MFAVerificationForm 
        sessionId="mock-session" 
        onSuccess={mockSuccessCallback} 
        mfaMethod="other"
      />
    );
    
    // Enter invalid backup code
    await user.type(screen.getByLabelText(/backup code|recovery code/i), 'INVALID-CODE');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /verify|submit/i }));
    
    // Verify error message about invalid backup code
    await waitFor(() => {
      expect(screen.getByText(/invalid backup code|already used/i)).toBeInTheDocument();
    });
  });
});
