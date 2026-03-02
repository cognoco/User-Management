import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNotifications } from '../useNotifications';
import { UserManagementConfiguration } from '@/core/config';
import type { NotificationService } from '@/core/notification/interfaces';
import type { NotificationBatch, Notification } from '@/core/notification/models';

const sampleNotifications: Notification[] = [
  {
    id: 'n1',
    userId: 'u1',
    channel: 'inApp' as any,
    title: 'Hello',
    message: 'World',
    priority: 'default' as any,
    category: 'system' as any,
    status: 'delivered' as any,
    isRead: false,
    createdAt: '2024-01-01T00:00:00Z'
  }
];

const batch: NotificationBatch = {
  notifications: sampleNotifications,
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
  unreadCount: 1
};

const mockService: NotificationService = {
  initialize: vi.fn(),
  sendNotification: vi.fn(),
  sendBulkNotification: vi.fn(),
  scheduleNotification: vi.fn(),
  cancelScheduledNotification: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  sendTemplatedNotification: vi.fn(),
  getUserPreferences: vi.fn(),
  updateUserPreferences: vi.fn(),
  getUserNotifications: vi.fn(async () => batch),
  markAsRead: vi.fn(async () => ({ success: true })),
  markAllAsRead: vi.fn(async () => ({ success: true, count: 1 })),
  deleteNotification: vi.fn(),
  getDeliveryStatus: vi.fn(),
  registerDevice: vi.fn(),
  unregisterDevice: vi.fn(),
  isChannelEnabled: vi.fn(),
  onNotificationEvent: vi.fn(() => () => {})
};

describe('useNotifications', () => {
  beforeEach(() => {
    UserManagementConfiguration.reset();
    UserManagementConfiguration.configureServiceProviders({ notificationService: mockService });
    vi.clearAllMocks();
  });

  it('fetches notifications', async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.fetchNotifications();
    });
    expect(mockService.getUserNotifications).toHaveBeenCalledWith('me', undefined);
    expect(result.current.notifications.length).toBe(1);
    expect(result.current.unreadCount).toBe(1);
  });

  it('marks notification as read', async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.fetchNotifications();
      await result.current.markAsRead('n1');
    });
    expect(mockService.markAsRead).toHaveBeenCalledWith('n1');
    expect(result.current.notifications[0].isRead).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it('marks all as read', async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.fetchNotifications();
      await result.current.markAllAsRead();
    });
    expect(mockService.markAllAsRead).toHaveBeenCalledWith('me', undefined);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications[0].isRead).toBe(true);
  });
});
