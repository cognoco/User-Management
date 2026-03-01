import { vi } from 'vitest';
import type { NotificationService } from '@/core/notification/interfaces';
import type { NotificationBatch } from '@/core/notification/models';

export function createMockNotificationService(overrides: Partial<NotificationService> = {}): NotificationService {
  const defaultBatch: NotificationBatch = {
    notifications: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    unreadCount: 0,
  };

  const service: NotificationService = {
    initialize: vi.fn(async () => {}),
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
    getUserNotifications: vi.fn(async () => defaultBatch),
    markAsRead: vi.fn(async () => ({ success: true })),
    markAllAsRead: vi.fn(async () => ({ success: true, count: defaultBatch.notifications.length })),
    deleteNotification: vi.fn(),
    getDeliveryStatus: vi.fn(),
    registerDevice: vi.fn(),
    unregisterDevice: vi.fn(),
    isChannelEnabled: vi.fn(async () => true),
    onNotificationEvent: vi.fn(() => () => {}),
    ...overrides,
  } as NotificationService;

  return service;
}
