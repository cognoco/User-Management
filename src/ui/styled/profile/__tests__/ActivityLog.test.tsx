// Mock useAuth BEFORE all imports to avoid real authentication calls
const stableUser = {
  id: 'user-1',
  email: 'testuser@example.com',
  name: 'Test User'
};
vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: stableUser })
}));
const fetchLogsMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/stores/user.store', async () => {
  const { create } = await import('zustand');
  const store = create(() => ({
    isLoading: false,
    error: null,
    fetchUserAuditLogs: fetchLogsMock,
  }));
  return { useUserStore: store };
});

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import ActivityLog from '../ActivityLog';
import { useUserStore } from '@/lib/stores/user.store';

describe('ActivityLog', () => {
  beforeEach(() => {
    useUserStore.setState({ isLoading: false, error: null });
    fetchLogsMock.mockResolvedValue({
      logs: [
        {
          id: 'log-1',
          user_id: 'user-1',
          action: 'LOGIN_SUCCESS',
          status: 'SUCCESS',
          timestamp: new Date().toISOString(),
          ip_address: '127.0.0.1',
          user_agent: 'Chrome'
        }
      ],
      pagination: { page: 1, totalPages: 1 }
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders activity log entries', async () => {
    await act(async () => {
      render(<ActivityLog />);
    });
    expect(screen.getByText('Account Activity Log')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('LOGIN_SUCCESS')).toBeInTheDocument();
      expect(screen.getByText('SUCCESS')).toBeInTheDocument();
      expect(screen.getByText('127.0.0.1')).toBeInTheDocument();
      expect(screen.getByText('Chrome')).toBeInTheDocument();
    });
  });

  it('shows loading state', async () => {
    useUserStore.setState({ isLoading: true });
    fetchLogsMock.mockImplementation(() => new Promise(() => {}));
    await act(async () => {
      render(<ActivityLog />);
    });
    expect(screen.getByText('Loading activity log...')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    fetchLogsMock.mockRejectedValue(new Error('Failed'));
    await act(async () => {
      render(<ActivityLog />);
    });
    useUserStore.setState({ error: 'Failed to load activity log.' });
    await waitFor(() => {
      expect(screen.getByText('Failed to load activity log.')).toBeInTheDocument();
    });
  });

  it('shows empty state', async () => {
    fetchLogsMock.mockResolvedValue({ logs: [], pagination: { page: 1, totalPages: 1 } });
    await act(async () => {
      render(<ActivityLog />);
    });
    await waitFor(() => {
      expect(screen.getByText('No activity found.')).toBeInTheDocument();
    });
  });
});
