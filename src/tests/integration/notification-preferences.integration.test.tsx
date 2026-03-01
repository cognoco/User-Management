import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { NotificationPreferences } from '@/ui/styled/shared/NotificationPreferences';
import { usePreferencesStore, type PreferencesState } from '@/lib/stores/preferences.store';
import { api } from '@/lib/api/axios';

// Mock the API and Supabase
vi.mock('@/lib/api/axios');
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

const mockPreferencesBase = {
  id: '00000000-0000-0000-0000-000000000001',
  userId: '00000000-0000-0000-0000-000000000002',
  language: 'en',
  theme: 'system' as const,
  itemsPerPage: 25,
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

describe('Notification Preferences Integration', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();

    // Mock the preferences store
    (usePreferencesStore as any).mockImplementation((selector?: (state: PreferencesState) => any) => {
      const store = {
        preferences: {
          ...mockPreferencesBase,
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

    await waitFor(() => {
      expect(screen.getByText('Email Notifications')).toBeInTheDocument();
      expect(screen.getByText('Push Notifications')).toBeInTheDocument();
      expect(screen.getByText('Marketing Communications')).toBeInTheDocument();
    });

    // Email should be checked, others unchecked
    const emailSwitch = screen.getByRole('switch', { name: /Email Notifications/i });
    const pushSwitch = screen.getByRole('switch', { name: /Push Notifications/i });
    const marketingSwitch = screen.getByRole('switch', { name: /Marketing Communications/i });
    
    expect(emailSwitch).toHaveAttribute('aria-checked', 'true');
    expect(pushSwitch).toHaveAttribute('aria-checked', 'false');
    expect(marketingSwitch).toHaveAttribute('aria-checked', 'false');
  });

  test('user can toggle notification preferences', async () => {
    const updatePreferencesMock = vi.fn().mockResolvedValue(true);
    (usePreferencesStore as any).mockImplementation((selector?: (state: PreferencesState) => any) => {
      const store = {
        preferences: {
          ...mockPreferencesBase,
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

    // Toggle push notifications on
    const pushSwitch = screen.getByRole('switch', { name: /Push Notifications/i });
    await user.click(pushSwitch);

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
    // Mock API calls
    (api.get as any).mockResolvedValue({
      data: {
        notifications: {
          email: true,
          push: true,
          marketing: false
        }
      }
    });
    (api.patch as any).mockResolvedValue({
      data: {
        notifications: {
          email: true,
          push: false,
          marketing: true
        }
      }
    });

    // Test the store functionality directly
    const store = usePreferencesStore.getState();
    
    // Fetch preferences
    await store.fetchPreferences();
    
    // Verify the correct API endpoint was called
    expect(api.get).toHaveBeenCalledWith('/api/preferences');
    
    // Update preferences
    const result = await store.updatePreferences({
      notifications: {
        email: true,
        push: false,
        marketing: true
      }
    });
    
    // Verify the correct API endpoint and payload were used
    expect(api.patch).toHaveBeenCalledWith('/api/preferences', {
      notifications: {
        email: true,
        push: false,
        marketing: true
      }
    });
    
    // Verify the operation was successful
    expect(result).toBe(true);
  });
}); 