import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, Mock } from 'vitest';
import MFAManagementSection from '../MFAManagementSection';

// Mock useAuth hook globally
vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn()
}));
import { useAuth } from '@/hooks/auth/useAuth';

const mockUserBase = {
  id: 'user-123',
  email: 'user@example.com',
  user_metadata: {}
};

describe('MFAManagementSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders setup prompt when no factors are enrolled', () => {
    (useAuth as unknown as Mock).mockReturnValue({ user: { ...mockUserBase, user_metadata: {} } });
    render(<MFAManagementSection />);
    expect(screen.getByText(/setup/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /setup/i })).toBeInTheDocument();
  });

  it('renders enrolled TOTP and SMS factors', () => {
    (useAuth as unknown as Mock).mockReturnValue({
      user: {
        ...mockUserBase,
        user_metadata: {
          mfaMethods: ['totp', 'sms'],
          totpEnabled: true,
          mfaSmsVerified: true,
          mfaPhone: '+1234567890',
          backupCodes: ['111', '222', '333']
        }
      }
    });
    render(<MFAManagementSection />);
    expect(screen.getByText(/enabled/i)).toBeInTheDocument();
    expect(screen.getByText(/totp/i)).toBeInTheDocument();
    expect(screen.getByText(/sms/i)).toBeInTheDocument();
    expect(screen.getByText(/\*\*\*\*7890/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('removes a factor and shows success', async () => {
    const disableMock = vi.fn().mockResolvedValue({ success: true, message: 'ok' });
    (useAuth as unknown as Mock).mockReturnValue({
      user: { ...mockUserBase },
      getUserMFAMethods: vi.fn().mockResolvedValue([
        { id: 'sms1', type: 'sms', name: 'sms', isEnabled: true, createdAt: new Date() }
      ]),
      getAvailableMFAMethods: vi.fn().mockResolvedValue([]),
      disableMFAMethod: disableMock,
      regenerateMFABackupCodes: vi.fn(),
      isLoading: false,
      error: null
    });
    render(<MFAManagementSection />);
    // Click remove button
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /remove/i }));
    });
    // Confirm removal in dialog
    await act(async () => {
      await userEvent.click(screen.getAllByRole('button', { name: /remove/i })[1]);
    });
    await waitFor(() => {
      expect(disableMock).toHaveBeenCalledWith('sms1');
      expect(screen.getByText(/success/i)).toBeInTheDocument();
    });
  });

  it('shows error alert if API fails to remove factor', async () => {
    const disableMock = vi.fn().mockResolvedValue({ success: false, error: 'Failed to remove' });
    (useAuth as unknown as Mock).mockReturnValue({
      user: { ...mockUserBase },
      getUserMFAMethods: vi.fn().mockResolvedValue([
        { id: 'sms1', type: 'sms', name: 'sms', isEnabled: true, createdAt: new Date() }
      ]),
      getAvailableMFAMethods: vi.fn().mockResolvedValue([]),
      disableMFAMethod: disableMock,
      regenerateMFABackupCodes: vi.fn(),
      isLoading: false,
      error: null
    });
    render(<MFAManagementSection />);
    // Click remove button
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /remove/i }));
    });
    // Confirm removal in dialog
    await act(async () => {
      await userEvent.click(screen.getAllByRole('button', { name: /remove/i })[1]);
    });
    await waitFor(() => {
      expect(disableMock).toHaveBeenCalledWith('sms1');
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to remove/i);
    });
  });

  it('shows success alert when factor is removed', async () => {
    const disableMock = vi.fn().mockResolvedValue({ success: true });
    (useAuth as unknown as Mock).mockReturnValue({
      user: { ...mockUserBase },
      getUserMFAMethods: vi.fn().mockResolvedValue([
        { id: 'totp1', type: 'totp', name: 'totp', isEnabled: true, createdAt: new Date() }
      ]),
      getAvailableMFAMethods: vi.fn().mockResolvedValue([]),
      disableMFAMethod: disableMock,
      regenerateMFABackupCodes: vi.fn(),
      isLoading: false,
      error: null
    });
    render(<MFAManagementSection />);
    // Click remove button
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /remove/i }));
    });
    // Confirm removal in dialog
    await act(async () => {
      await userEvent.click(screen.getAllByRole('button', { name: /remove/i })[1]);
    });
    await waitFor(() => {
      expect(disableMock).toHaveBeenCalledWith('totp1');
      expect(screen.getByText(/success/i)).toBeInTheDocument();
    });
  });
}); 