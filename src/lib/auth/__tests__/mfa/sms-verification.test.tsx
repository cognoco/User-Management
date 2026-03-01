import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MFAVerificationForm } from '@/ui/styled/auth/MFAVerificationForm';
import { api } from '@/lib/api/axios';

// Mock API
vi.mock('@/lib/api/axios', () => ({
  api: {
    post: vi.fn(),
  },
}));

describe('SMS MFA Verification During Login', () => {
  const mockAccessToken = 'mock-access-token';
  const mockSuccessCallback = vi.fn();
  const mockCancelCallback = vi.fn();
  
  let user: ReturnType<typeof userEvent.setup>;
  
  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });
  
  test('should send SMS verification code and verify successfully', async () => {
    // Mock successful code verification
    (api.post as any).mockResolvedValueOnce({
      data: {
        user: { id: 'user123' },
        token: 'new-token-after-mfa'
      }
    });
    
    render(
      <MFAVerificationForm
        sessionId={mockAccessToken}
        onSuccess={mockSuccessCallback}
        onCancel={mockCancelCallback}
        enableResendCode={true}
        mfaMethod={"sms"}
      />
    );
    
    // Enter valid SMS code
    await user.type(screen.getByLabelText(/code/i), '123456');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /verify/i }));
    
    // Verify API was called with correct parameters
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/mfa/verify', {
        code: '123456',
        method: "sms",
        accessToken: mockAccessToken,
        rememberDevice: false
      });
    });
    
    // Verify success callback was called with user and token
    await waitFor(() => {
      expect(mockSuccessCallback).toHaveBeenCalledWith(
        { id: 'user123' },
        'new-token-after-mfa'
      );
    });
  });
  
  test('should handle SMS verification error', async () => {
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
        sessionId={mockAccessToken}
        onSuccess={mockSuccessCallback}
        onCancel={mockCancelCallback}
        enableResendCode={true}
        mfaMethod={"sms"}
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
  
  test('should resend SMS verification code', async () => {
    // Mock successful resend
    (api.post as any).mockResolvedValueOnce({
      data: { success: true }
    });
    
    render(
      <MFAVerificationForm
        sessionId={mockAccessToken}
        onSuccess={mockSuccessCallback}
        onCancel={mockCancelCallback}
        enableResendCode={true}
        mfaMethod={"sms"}
      />
    );
    
    // Click resend button
    const resendButton = screen.getByRole('button', { name: /resend/i });
    await user.click(resendButton);
    
    // Verify API was called to resend SMS
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/mfa/resend-sms', {
        accessToken: mockAccessToken
      });
    });
    
    // Verify success message is displayed
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
    
    // Verify resend button is temporarily disabled
    expect(resendButton).toHaveAttribute('disabled');
  });
  
  test('should allow user to cancel verification', async () => {
    render(
      <MFAVerificationForm
        sessionId={mockAccessToken}
        onSuccess={mockSuccessCallback}
        onCancel={mockCancelCallback}
        enableResendCode={true}
        mfaMethod={"sms"}
      />
    );
    
    // Click cancel button
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    
    // Verify cancel callback was called
    expect(mockCancelCallback).toHaveBeenCalled();
  });
  
  test('should allow "remember device" option', async () => {
    // Mock successful verification
    (api.post as any).mockResolvedValueOnce({
      data: {
        user: { id: 'user123' },
        token: 'new-token-after-mfa'
      }
    });
    
    render(
      <MFAVerificationForm
        sessionId={mockAccessToken}
        onSuccess={mockSuccessCallback}
        onCancel={mockCancelCallback}
        enableResendCode={true}
        enableRememberDevice={true}
        mfaMethod={"sms"}
      />
    );
    
    // Check "remember device" checkbox
    await user.click(screen.getByLabelText(/remember/i));
    
    // Enter valid code and submit
    await user.type(screen.getByLabelText(/code/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify/i }));
    
    // Verify API was called with rememberDevice set to true
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/mfa/verify', {
        code: '123456',
        method: "sms",
        accessToken: mockAccessToken,
        rememberDevice: true
      });
    });
  });
}); 