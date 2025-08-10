// __tests__/auth/mfa/setup.test.js

import { vi, Mock, beforeEach, describe, test, expect } from 'vitest';
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TwoFactorSetup } from '@/ui/styled/auth/TwoFactorSetup';
import { api } from '@/lib/api/axios';

// Import our standardized mock using vi.mock with async dynamic import and alias (no extension)
vi.mock('@/lib/database/supabase', async () => { 
  const mod = await import('@/tests/mocks/supabase');
  return mod; 
});
import { supabase } from '@/lib/database/supabase';

// Mock the API instance specifically for these tests
vi.mock('@/lib/api/axios');

describe('Multi-Factor Authentication Setup', () => {
  let user: ReturnType<typeof userEvent.setup>;
  
  // Mock authenticated user
  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    phone: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    
    // Mock getUser needed for potential internal checks
    (supabase.auth.getUser as Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
    
    // Reset api mock before each test
    vi.resetAllMocks(); 
  });

  test('User can setup TOTP (app-based) authentication', async () => {
    // Mock the specific API call for TOTP setup
    (api.post as Mock).mockImplementation(async (url: string) => {
      if (url === '/api/2fa/setup') {
        return Promise.resolve({ 
          data: {
            qrCode: 'data:image/png;base64,TEST_QR_CODE_DATA',
            secret: 'ABCDEF123456'
          }
        });
      }
      if (url === '/api/2fa/verify') { // Mock verify API call
        return Promise.resolve({ data: {} }); 
      }
      if (url === '/api/2fa/backup-codes') { // Mock backup code generation
        return Promise.resolve({ data: { codes: ['111','222','333'] } });
      }
      return Promise.reject(new Error(`Unhandled API POST call to ${url}`));
    });

    // Render MFA setup component
    render(<TwoFactorSetup />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Select a 2FA method')).toBeInTheDocument(); 
    });
    
    // Select TOTP option (Authenticator App)
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Authenticator App' })); 
    });
    
    // Verify QR code is displayed
    await waitFor(() => {
      expect(screen.getByAltText('QR Code')).toBeInTheDocument(); 
      expect(screen.getByText('ABCDEF123456')).toBeInTheDocument(); 
    });
    
    // Enter verification code
    await act(async () => {
        const codeInput = screen.getByLabelText(/verification code/i) || screen.getByPlaceholderText(/enter.*code/i);
        await user.type(codeInput, '123456'); 
    });
    
    // Submit verification
    await act(async () => {
        await user.click(screen.getByRole('button', { name: /verify/i })); 
    });
    
    // Verify API calls were made and component moved to backup step
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/2fa/setup', { method: 'totp' });
      expect(api.post).toHaveBeenCalledWith('/api/2fa/verify', { method: 'totp', code: '123456' });
      expect(api.post).toHaveBeenCalledWith('/api/2fa/backup-codes');
      expect(screen.getByText(/backup.*code/i)).toBeInTheDocument();
      expect(screen.getByText('111')).toBeInTheDocument(); // Check if backup code is rendered
    });
  });

  test('User can setup SMS (text message) authentication', async () => {
    // Mock the specific API calls for SMS setup
    (api.post as Mock).mockImplementation(async (url: string, body: any) => {
      if (url === '/api/2fa/setup') {
        // Step 1: User selects SMS and enters phone
        if (body.method === 'sms') {
          return Promise.resolve({ data: { phone: '+1234567890' } });
        }
      }
      if (url === '/api/2fa/send-sms') {
        // Step 2: Send code to phone
        return Promise.resolve({ data: { sent: true } });
      }
      if (url === '/api/2fa/verify') {
        // Step 3: User enters code and verifies
        if (body.method === 'sms' && body.code === '654321') {
          return Promise.resolve({ data: {} });
        } else {
          return Promise.reject({ response: { data: { error: 'Invalid code' } } });
        }
      }
      if (url === '/api/2fa/backup-codes') {
        // Step 4: Generate backup codes
        return Promise.resolve({ data: { codes: ['444','555','666'] } });
      }
      return Promise.reject(new Error(`Unhandled API POST call to ${url}`));
    });

    render(<TwoFactorSetup />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Select a 2FA method')).toBeInTheDocument();
    });

    // Select SMS option
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'SMS' }));
    });

    // Enter phone number
    await act(async () => {
      const phoneInput = screen.getByLabelText(/phone/i) || screen.getByPlaceholderText(/phone/i);
      await user.type(phoneInput, '+1234567890');
    });

    // Submit phone number to send code
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /send.*code/i }));
    });

    // Wait for code entry UI
    await waitFor(() => {
      const codeInput = screen.getByLabelText(/code/i) || screen.getByPlaceholderText(/code/i);
      expect(codeInput).toBeInTheDocument();
    });

    // Enter the received code
    await act(async () => {
      const codeInput = screen.getByLabelText(/code/i) || screen.getByPlaceholderText(/code/i);
      await user.type(codeInput, '654321');
    });

    // Submit verification
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /verify/i }));
    });

    // Verify API calls were made and backup codes are shown
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/2fa/setup', { method: 'sms', phone: '+1234567890' });
      expect(api.post).toHaveBeenCalledWith('/api/2fa/send-sms', { phone: '+1234567890' });
      expect(api.post).toHaveBeenCalledWith('/api/2fa/verify', { method: 'sms', code: '654321' });
      expect(api.post).toHaveBeenCalledWith('/api/2fa/backup-codes');
      expect(screen.getByText(/backup.*code/i)).toBeInTheDocument();
      expect(screen.getByText('444')).toBeInTheDocument();
    });
  });

  // test('User can generate and view backup codes', async () => { ... });

  // test('Handles TOTP setup errors', async () => { ... });

  // test('User can disable an existing MFA method', async () => { ... });

  // test('User can change MFA method name', async () => { ... });
});
