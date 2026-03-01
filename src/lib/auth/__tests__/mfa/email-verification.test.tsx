import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MFAVerificationForm } from '@/ui/styled/auth/MFAVerificationForm';
import { api } from '@/lib/api/axios';
import { TwoFactorMethod } from '@/types/2fa';

// Mock API
vi.mock('@/lib/api/axios', () => ({
  api: {
    post: vi.fn(),
  },
}));

describe('Email MFA Verification During Login', () => {
  const mockSessionId = 'mock-session-id';
  const mockSuccessCallback = vi.fn();
  const mockCancelCallback = vi.fn();
  
  let user: ReturnType<typeof userEvent.setup>;
  
  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });
  
  test('should send Email verification code and verify successfully', async () => {
    // Mock successful code verification
    (api.post as any).mockResolvedValueOnce({
      data: {
        user: { id: 'user123' },
        token: 'new-token-after-mfa'
      }
    });
    
    render(
      <MFAVerificationForm
        sessionId={mockSessionId}
        onSuccess={mockSuccessCallback}
        onCancel={mockCancelCallback}
        enableResendCode={true}
        mfaMethod={TwoFactorMethod.EMAIL}
      />
    );
    
    // Enter valid Email code
    await user.type(screen.getByLabelText(/code/i), '123456');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /verify/i }));
    
    // Verify API was called with correct parameters
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/mfa/verify', {
        code: '123456',
        method: TwoFactorMethod.EMAIL,
        sessionId: mockSessionId,
        rememberDevice: false
      });
    });
    
    // Verify success callback was called
    await waitFor(() => {
      expect(mockSuccessCallback).toHaveBeenCalled();
    });
  });
  
  test('should handle Email verification error', async () => {
    // Mock failed verification
    (api.post as any).mockRejectedValueOnce({
      response: {
        data: {
          error: 'Invalid verification code'
        }
      }
    });
    
    render(
      <MFAVerificationForm
        sessionId={mockSessionId}
        onSuccess={mockSuccessCallback}
        onCancel={mockCancelCallback}
        enableResendCode={true}
        mfaMethod={TwoFactorMethod.EMAIL}
      />
    );
    
    // Enter invalid code
    await user.type(screen.getByLabelText(/code/i), '999999');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /verify/i }));
    
    // Verify error is displayed
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/invalid verification code/i)).toBeInTheDocument();
    });
    
    // Verify success callback was not called
    expect(mockSuccessCallback).not.toHaveBeenCalled();
  });
  
  test('should resend Email verification code', async () => {
    // Mock successful resend
    (api.post as any).mockResolvedValueOnce({
      data: { success: true }
    });
    
    render(
      <MFAVerificationForm
        sessionId={mockSessionId}
        onSuccess={mockSuccessCallback}
        onCancel={mockCancelCallback}
        enableResendCode={true}
        mfaMethod={TwoFactorMethod.EMAIL}
      />
    );
    
    // Click resend button
    const resendButton = screen.getByRole('button', { name: /resend/i });
    await user.click(resendButton);
    
    // Verify API was called to resend email
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/mfa/resend-email', {
        sessionId: mockSessionId
      });
    });
    
    // Verify success message is displayed
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
    
    // Verify resend button is temporarily disabled
    expect(resendButton).toHaveAttribute('disabled');
  });
  
  test('should allow switching between verification methods', async () => {
    render(
      <MFAVerificationForm
        sessionId={mockSessionId}
        onSuccess={mockSuccessCallback}
        onCancel={mockCancelCallback}
        enableResendCode={true}
        mfaMethod={TwoFactorMethod.EMAIL}
      />
    );
    
    // Initially shows standard code entry
    expect(screen.getByText(/enter code/i)).toBeInTheDocument();
    
    // Switch to backup code entry
    await user.click(screen.getByRole('button', { name: /use backup code/i }));
    
    // Verify form switched to backup code mode
    expect(screen.getByText(/enter backup code/i)).toBeInTheDocument();
    
    // Switch back to standard code entry
    await user.click(screen.getByRole('button', { name: /use totp instead/i }));
    
    // Verify form switched back
    expect(screen.getByText(/enter code/i)).toBeInTheDocument();
  });
  
  test('should handle code expiry errors correctly', async () => {
    // Mock expired code error
    (api.post as any).mockRejectedValueOnce({
      response: {
        data: {
          error: 'Verification code expired. Please request a new code.'
        }
      }
    });
    
    render(
      <MFAVerificationForm
        sessionId={mockSessionId}
        onSuccess={mockSuccessCallback}
        onCancel={mockCancelCallback}
        enableResendCode={true}
        mfaMethod={TwoFactorMethod.EMAIL}
      />
    );
    
    // Enter expired code
    await user.type(screen.getByLabelText(/code/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify/i }));
    
    // Verify expiry error is displayed
    await waitFor(() => {
      expect(screen.getByText(/code expired/i)).toBeInTheDocument();
    });
    
    // Now verify we can resend a code
    const resendButton = screen.getByRole('button', { name: /resend/i });
    
    // Mock successful resend after expiry
    (api.post as any).mockResolvedValueOnce({
      data: { success: true }
    });
    
    // Click resend
    await user.click(resendButton);
    
    // Verify API was called to resend
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/mfa/resend-email', {
        sessionId: mockSessionId
      });
    });
  });
}); 