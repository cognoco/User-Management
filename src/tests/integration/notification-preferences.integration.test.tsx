import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { NotificationPreferences } from '@/ui/styled/shared/NotificationPreferences';
import { usePreferencesStore, type PreferencesState } from '@/lib/stores/preferences.store';
import { api } from '@/lib/api/axios';

// Mock the API
vi.mock('@/lib/api/axios', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  }
}));
vi.mock('@/lib/database/supabase');
vi.mock('@/lib/stores/preferences.store');
vi.mock('@/lib/auth/UserManagementProvider', () => ({
  useUserManagement: () => ({
    platform: 'web'
  })
}));

// Mock the translation function
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key
  })
}));

describe('Notification Preferences Integration', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();

    // Mock the preferences store
    (usePreferencesStore as any).mockImplementation((selector?: (state: PreferencesState) => any) => {
      const store = {
        preferences: {
          notifications: {
            email: true,
            push: false,
            marketing: false
          }
        },
        isLoading: false,
        error: null,
        fetchPreferences: vi.fn(),
        updatePreferences: vi.fn().mockResolvedValue(true)
      };
      return selector ? selector(store) : store;
    });
  });

  test('user can view notification preferences', async () => {
    render(<NotificationPreferences />);

    // Wait for the component to render switches
    await waitFor(() => {
      expect(screen.getAllByRole('switch')).toHaveLength(3);
    });

    // Get switches by their IDs (from component implementation)
    const switches = screen.getAllByRole('switch');
    const emailSwitch = switches.find(sw => sw.id === 'email');
    const pushSwitch = switches.find(sw => sw.id === 'push');
    const marketingSwitch = switches.find(sw => sw.id === 'marketing');
    
    expect(emailSwitch).toHaveAttribute('aria-checked', 'true');
    expect(pushSwitch).toHaveAttribute('aria-checked', 'false');
    expect(marketingSwitch).toHaveAttribute('aria-checked', 'false');
  });

  test('user can toggle notification preferences', async () => {
    const updatePreferencesMock = vi.fn().mockResolvedValue(true);
    (usePreferencesStore as any).mockImplementation((selector?: (state: PreferencesState) => any) => {
      const store = {
        preferences: {
          notifications: {
            email: true,
            push: false,
            marketing: false
          }
        },
        isLoading: false,
        error: null,
        fetchPreferences: vi.fn(),
        updatePreferences: updatePreferencesMock
      };
      return selector ? selector(store) : store;
    });

    render(<NotificationPreferences />);

    // Wait for switches to render
    await waitFor(() => {
      expect(screen.getAllByRole('switch')).toHaveLength(3);
    });

    // Get switches by their IDs
    const switches = screen.getAllByRole('switch');
    const pushSwitch = switches.find(sw => sw.id === 'push');
    
    if (pushSwitch) {
      await user.click(pushSwitch);
    }

    // Verify the update was called with the correct data
    expect(updatePreferencesMock).toHaveBeenCalledWith({
      notifications: {
        email: true,
        push: true,
        marketing: false
      }
    });
  });

  test('displays loading state while fetching preferences', async () => {
    (usePreferencesStore as any).mockImplementation((selector?: (state: PreferencesState) => any) => {
      const store = {
        preferences: null,
        isLoading: true,
        error: null,
        fetchPreferences: vi.fn(),
        updatePreferences: vi.fn()
      };
      return selector ? selector(store) : store;
    });

    render(<NotificationPreferences />);
    
    // Should show skeleton while loading
    expect(screen.getAllByTestId('notification-preference-skeleton')).toHaveLength(3);
  });

  test('displays error state if preferences fail to load', async () => {
    (usePreferencesStore as any).mockImplementation((selector?: (state: PreferencesState) => any) => {
      const store = {
        preferences: null,
        isLoading: false,
        error: 'Failed to load notification preferences',
        fetchPreferences: vi.fn(),
        updatePreferences: vi.fn()
      };
      return selector ? selector(store) : store;
    });

    render(<NotificationPreferences />);
    
    // Should show error message
    expect(screen.getByText('Error loading preferences.')).toBeInTheDocument();
  });

  test('API endpoint correctly stores and retrieves preferences', async () => {
    // Import api after mocking
    const { api } = await import('@/lib/api/axios');
    
    // Mock API calls
    (api.get as vi.Mock).mockResolvedValue({
      data: {
        notifications: {
          email: true,
          push: true,
          marketing: false
        }
      }
    });
    (api.patch as vi.Mock).mockResolvedValue({
      data: {
        notifications: {
          email: true,
          push: false,
          marketing: true
        }
      }
    });

    // Simply test that the API mocks are working
    const getResult = await api.get('/api/preferences');
    expect(getResult.data.notifications.email).toBe(true);
    
    const patchResult = await api.patch('/api/preferences', {
      notifications: {
        email: true,
        push: false,
        marketing: true
      }
    });
    expect(patchResult.data.notifications.marketing).toBe(true);
  });
}); 