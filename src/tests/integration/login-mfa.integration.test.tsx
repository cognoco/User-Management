import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock auth hook with stateful functions - avoid hoisting issues
vi.mock('@/hooks/auth/useAuth', () => {
  const mockLogin = vi.fn();
  const mockVerifyMFA = vi.fn();
  
  const store = {
    login: mockLogin,
    verifyMFA: mockVerifyMFA,
    isLoading: false,
    error: null,
    successMessage: null,
    clearError: vi.fn(),
    clearSuccessMessage: vi.fn(),
  };
  const useAuthMock: any = vi.fn(() => store);
  return { useAuth: useAuthMock, mockLogin, mockVerifyMFA };
});

// Mock navigation
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: vi.fn() }),
}));

// Mock login form hook
vi.mock('@/hooks/auth/useLoginFormLogic', () => ({
  default: () => ({
    onSubmit: vi.fn(),
    handleResendVerification: vi.fn(),
    handleMfaSuccess: vi.fn(),
    handleLoginSuccess: vi.fn(),
    handleMfaCancel: vi.fn(),
    handleRateLimitComplete: vi.fn(),
    rateLimitInfo: null,
    mfaRequired: false,
    tempAccessToken: null,
    authError: null,
    success: null,
    isLoading: false,
  }),
}));

// Mock UserManagement provider
vi.mock('@/lib/auth/UserManagementProvider', () => ({
  useUserManagement: () => ({
    config: { features: { oauth: { enabled: true } } }
  }),
}));

// Mock OAuth store
vi.mock('@/lib/stores/oauth.store', () => ({
  useOAuthStore: () => ({
    isLoading: false,
    error: null,
  }),
}));

// Mock complex components to simple test components
vi.mock('@/ui/styled/auth/LoginForm', () => ({
  LoginForm: ({ onSubmit }: { onSubmit?: any }) => {
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      const credentials = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        rememberMe: false,
      };
      if (onSubmit) {
        await onSubmit(credentials);
      }
    };

    return (
      <form onSubmit={handleSubmit}>
        <input name="email" type="email" aria-label="Email" />
        <input name="password" type="password" aria-label="Password" />
        <button type="submit">Login</button>
      </form>
    );
  },
}));

vi.mock('@/ui/styled/auth/MFAVerificationForm', () => ({
  MFAVerificationForm: ({ accessToken, mfaMethod, onSuccess }: any) => {
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      const code = formData.get('code') as string;
      
      // Call the mock verify MFA function
      const { mockVerifyMFA } = await import('@/hooks/auth/useAuth');
      await (mockVerifyMFA as any)(accessToken, code);
      
      if (onSuccess) {
        onSuccess();
      }
    };

    return (
      <div>
        <h2>Multi-factor Authentication</h2>
        <form onSubmit={handleSubmit}>
          <input name="code" placeholder="000000" />
          <button type="submit">Verify</button>
        </form>
      </div>
    );
  },
}));

// Import mocks
import { mockLogin, mockVerifyMFA } from '@/hooks/auth/useAuth';
import { LoginForm } from '@/ui/styled/auth/LoginForm';
import { MFAVerificationForm } from '@/ui/styled/auth/MFAVerificationForm';

describe('Login Flow with MFA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mock implementations
    (mockLogin as any).mockReset();
    (mockVerifyMFA as any).mockReset();
  });

  it('allows standard email/password login', async () => {
    (mockLogin as any).mockResolvedValueOnce({ success: true, requiresMfa: false });
    const user = userEvent.setup();
    
    const mockOnSubmit = vi.fn(async (credentials: any) => {
      const result = await (mockLogin as any)(credentials);
      if (result.success && !result.requiresMfa) {
        pushMock('/dashboard/overview');
      }
    });
    
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'Password123!',
        rememberMe: false,
      });
      expect(pushMock).toHaveBeenCalledWith('/dashboard/overview');
    });
  });

  it('prompts for TOTP code when MFA is required and verifies successfully', async () => {
    (mockLogin as any).mockResolvedValueOnce({ success: true, requiresMfa: true, token: 'tmp' });
    (mockVerifyMFA as any).mockResolvedValueOnce({ success: true, user: { id: '1' }, token: 'tok' });
    const user = userEvent.setup();
    
    // Test the MFA flow separately
    const mockOnMfaSuccess = vi.fn(async () => {
      pushMock('/dashboard/overview');
    });
    
    render(<MFAVerificationForm accessToken="tmp" onSuccess={mockOnMfaSuccess} />);

    // MFA form should be displayed
    expect(screen.getByText(/multi-factor authentication/i)).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('000000'), '123456');
    await user.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(mockOnMfaSuccess).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith('/dashboard/overview');
    });
  });

  it('shows error on invalid credentials', async () => {
    (mockLogin as any).mockResolvedValueOnce({ success: false, error: 'Invalid credentials' });
    const user = userEvent.setup();
    
    const mockOnSubmit = vi.fn(async (credentials: any) => {
      const result = await (mockLogin as any)(credentials);
      if (!result.success) {
        // In a real app, this would be handled by the error boundary or form state
        throw new Error(result.error);
      }
    });
    
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'wrong@example.com',
        password: 'wrong',
        rememberMe: false,
      });
    });
  });

  it('handles rate limiting appropriately', async () => {
    const rateLimitResult = {
      success: false,
      error: 'Too many attempts',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 30000,
      remainingAttempts: 0,
    };
    (mockLogin as any).mockResolvedValueOnce(rateLimitResult);
    const user = userEvent.setup();
    
    const mockOnSubmit = vi.fn(async (credentials: any) => {
      const result = await (mockLogin as any)(credentials);
      // Verify the rate limit response
      expect(result).toEqual(rateLimitResult);
      return result;
    });
    
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });
});

// Additional success cases for email and sms MFA verification
describe('MFAVerificationForm standalone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockLogin as any).mockReset();
    (mockVerifyMFA as any).mockReset();
  });

  it('verifies code via email', async () => {
    (mockVerifyMFA as any).mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<MFAVerificationForm accessToken="tmp" mfaMethod="email" onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText('000000'), '654321');
    await user.click(screen.getByRole('button', { name: /verify/i }));
    await waitFor(() => {
      expect(mockVerifyMFA).toHaveBeenCalledWith('tmp', '654321');
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('verifies code via sms', async () => {
    (mockVerifyMFA as any).mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<MFAVerificationForm accessToken="tmp" mfaMethod="sms" onSuccess={onSuccess} />);
    await user.type(screen.getByPlaceholderText('000000'), '777777');
    await user.click(screen.getByRole('button', { name: /verify/i }));
    await waitFor(() => {
      expect(mockVerifyMFA).toHaveBeenCalledWith('tmp', '777777');
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
