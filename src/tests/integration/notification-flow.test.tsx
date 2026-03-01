// __tests__/integration/notification-flow.test.tsx

vi.mock('@/lib/api/axios');
vi.mock('@/lib/stores/preferences.store');
vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-123', email: 'user@example.com' } })
}));
vi.mock('@/lib/auth/UserManagementProvider', () => ({
  useUserManagement: () => ({ platform: 'web' })
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationPreferences } from '@/ui/styled/shared/NotificationPreferences';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { usePreferencesStore, type PreferencesState } from '@/lib/stores/preferences.store';
import { api } from '@/lib/api/axios';
import { UserManagementConfiguration } from '@/core/config';
import { createMockNotificationService } from '../mocks/notification.service.mock';
import { NotificationChannel, NotificationPriority, NotificationCategory, NotificationStatus } from '@/core/notification/models';
import type { NotificationBatch } from '@/core/notification/models';

// Import our standardized mock
import NotificationCenter from '@/ui/styled/common/NotificationCenter';

describe('Notification Management Flow', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    const store = {
      preferences: {
        notifications: { email: true, push: false, marketing: false }
      },
      isLoading: false,
      error: null,
      fetchPreferences: vi.fn(),
      updatePreferences: vi.fn().mockResolvedValue(true)
    } as unknown as PreferencesState;
    (usePreferencesStore as any).mockImplementation(
      (selector?: (state: PreferencesState) => any) =>
        selector ? selector(store) : store
    );

    (api.get as any).mockResolvedValue({ data: store.preferences });
    (api.patch as any).mockResolvedValue({ data: store.preferences });

    const notificationService = createMockNotificationService();
    UserManagementConfiguration.reset();
    UserManagementConfiguration.configureServiceProviders({
      notificationService
    });
  });

  test('User can view and update notification preferences', async () => {
    // Render notification settings
    render(<NotificationPreferences />);
    
    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByLabelText(/email notifications/i)).toBeChecked();
      expect(screen.getByLabelText(/push notifications/i)).not.toBeChecked();
    });
    
    // Verify notification types are displayed correctly
    expect(screen.getByLabelText(/system updates/i)).toBeChecked();
    expect(screen.getByLabelText(/new messages/i)).toBeChecked();
    expect(screen.getByLabelText(/activity summaries/i)).not.toBeChecked();
    
    // Update settings
    await user.click(screen.getByLabelText(/push notifications/i));
    await user.click(screen.getByLabelText(/activity summaries/i));
    
    // Mock successful update
    (api.patch as any).mockResolvedValueOnce({
      data: {
        notifications: {
          email: true,
          push: true,
          marketing: false,
        },
      },
    });
    
    // Save changes
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    
    // Verify save was successful
    await waitFor(() => {
      expect(screen.getByText(/settings saved/i)).toBeInTheDocument();
    });
    
    // Verify update was called with correct data
    expect(api.patch).toHaveBeenCalledWith('/api/preferences', {
      notifications: {
        email: true,
        push: true,
        marketing: false,
      },
    });
  });
  
  test('displays error when settings cannot be loaded', async () => {
    // Mock error loading settings
    (api.get as any).mockRejectedValueOnce(new Error('Error loading notification settings'));
    
    // Render notification settings
    render(<NotificationPreferences />);
    
    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/error loading notification settings/i)).toBeInTheDocument();
    });
    
    // Retry button should be visible
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
  
  test('handles error when saving settings', async () => {
    // Render notification settings
    render(<NotificationPreferences />);
    
    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByLabelText(/email notifications/i)).toBeInTheDocument();
    });
    
    // Make a change
    await user.click(screen.getByLabelText(/push notifications/i));
    
    // Mock error during update
    (api.patch as any).mockRejectedValueOnce(new Error('Error saving notification settings'));
    
    // Try to save changes
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    
    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/error saving notification settings/i)).toBeInTheDocument();
    });
  });
  
  test('can reset notification preferences to defaults', async () => {
    // Render notification settings
    render(<NotificationPreferences />);
    
    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByLabelText(/email notifications/i)).toBeChecked();
    });
    
    // Mock successful reset
    (api.patch as any).mockResolvedValueOnce({
      data: {
        notifications: {
          email: true,
          push: true,
          marketing: false,
        },
      },
    });
    
    // Click reset to defaults button
    await user.click(screen.getByRole('button', { name: /reset to defaults/i }));
    
    // Confirm reset
    await user.click(screen.getByRole('button', { name: /confirm/i }));
    
    // Verify reset was successful
    await waitFor(() => {
      expect(screen.getByText(/settings restored/i)).toBeInTheDocument();
    });
    
    // Verify defaults were applied
    expect(screen.getByLabelText(/push notifications/i)).toBeChecked();
    expect(screen.getByLabelText(/activity summaries/i)).toBeChecked();
  });
  
  test('can toggle individual notification channels', async () => {
    // Render notification settings
    render(<NotificationPreferences />);
    
    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByLabelText(/email notifications/i)).toBeInTheDocument();
    });
    
    // Expand notification channels section
    await user.click(screen.getByRole('button', { name: /notification channels/i }));
    
    // Verify channel options are displayed
    expect(screen.getByLabelText(/email/i)).toBeChecked();
    expect(screen.getByLabelText(/in-app/i)).toBeChecked();
    expect(screen.getByLabelText(/mobile/i)).not.toBeChecked();
    
    // Toggle mobile notifications on
    await user.click(screen.getByLabelText(/mobile/i));
    
    // Mock successful update
    (api.patch as any).mockResolvedValueOnce({
      data: {
        channels: {
          email: true,
          in_app: true,
          mobile: true,
        },
      },
    });
    
    // Save changes
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    
    // Verify update was called with correct data
    expect(api.patch).toHaveBeenCalledWith('/api/preferences', {
      channels: {
        email: true,
        in_app: true,
        mobile: true,
      },
    });
  });
  
  test('supports frequency settings for different notification types', async () => {
    // Render notification settings
    render(<NotificationPreferences />);
    
    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByLabelText(/email notifications/i)).toBeInTheDocument();
    });
    
    // Expand frequency settings
    await user.click(screen.getByRole('button', { name: /notification frequency/i }));
    
    // Verify frequency options are displayed
    expect(screen.getByLabelText(/system updates frequency/i)).toHaveValue('immediate');
    expect(screen.getByLabelText(/activity summaries frequency/i)).toHaveValue('daily');
    
    // Change frequency for activity summaries
    await user.selectOptions(
      screen.getByLabelText(/activity summaries frequency/i),
      'weekly'
    );
    
    // Mock successful update
    (api.patch as any).mockResolvedValueOnce({
      data: {
        frequency: {
          system_updates: 'immediate',
          activity_summaries: 'weekly',
        },
      },
    });
    
    // Save changes
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    
    // Verify update was called with correct data
    expect(api.patch).toHaveBeenCalledWith('/api/preferences', {
      frequency: {
        system_updates: 'immediate',
        activity_summaries: 'weekly',
      },
    });
  });
  
  test('supports quiet hours configuration', async () => {
    // Render notification settings
    render(<NotificationPreferences />);
    
    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByLabelText(/email notifications/i)).toBeInTheDocument();
    });
    
    // Enable quiet hours
    await user.click(screen.getByLabelText(/enable quiet hours/i));
    
    // Verify quiet hours inputs appear
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
    
    // Set quiet hours
    await user.clear(screen.getByLabelText(/start time/i));
    await user.type(screen.getByLabelText(/start time/i), '22:00');
    
    await user.clear(screen.getByLabelText(/end time/i));
    await user.type(screen.getByLabelText(/end time/i), '07:00');
    
    // Mock successful update
    (api.patch as any).mockResolvedValueOnce({
      data: {
        quiet_hours: {
          enabled: true,
          start_time: '22:00',
          end_time: '07:00',
        },
      },
    });
    
    // Save changes
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    
    // Verify update was called with correct data
    expect(api.patch).toHaveBeenCalledWith('/api/preferences', {
      quiet_hours: {
        enabled: true,
        start_time: '22:00',
        end_time: '07:00',
      },
    });
  });

  test('Admin receives and views SSO event notification end-to-end', async () => {
    const notifications = [
      {
        id: 'notif-sso-1',
        userId: 'user-123',
        channel: NotificationChannel.IN_APP,
        title: 'SSO Configuration Updated',
        message: 'The SSO configuration for your organization has been updated.',
        category: NotificationCategory.SECURITY,
        priority: NotificationPriority.DEFAULT,
        status: NotificationStatus.DELIVERED,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ];
    const notificationService = createMockNotificationService({
      getUserNotifications: vi.fn(async (_userId: string): Promise<NotificationBatch> => ({
        notifications,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        unreadCount: 1,
      })),
      markAsRead: vi.fn(async (id: string) => {
        const n = notifications.find(n => n.id === id);
        if (n) n.isRead = true;
        return { success: true };
      }),
    });
    UserManagementConfiguration.configureServiceProviders({ notificationService });

    render(<NotificationCenter />);
    // Wait for SSO notification to appear
    await waitFor(() => {
      expect(screen.getByText('SSO Configuration Updated')).toBeInTheDocument();
    });
    // Switch to SSO Events tab
    await userEvent.click(screen.getByRole('tab', { name: /SSO Events/i }));
    // Assert SSO notification is visible in SSO tab
    expect(screen.getByText('SSO Configuration Updated')).toBeInTheDocument();
    expect(screen.getByText('The SSO configuration for your organization has been updated.')).toBeInTheDocument();
    // Mark as read
    await userEvent.click(screen.getByRole('button', { name: /Mark as read/i }));
    // Notification should now be marked as read (opacity or other UI change)
    await waitFor(() => {
      expect(screen.getByText('SSO Configuration Updated').closest('div')).toHaveClass('opacity-60');
    });
  });
});
