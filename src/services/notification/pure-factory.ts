/**
 * Pure Notification Service Factory
 */

import type { NotificationService } from '@/core/notification/interfaces';
import type { UserService } from '@/core/user/interfaces';
import type { NotificationDataProvider } from '@/adapters/notification/interfaces';
import { DefaultNotificationService } from './default-notification.service';
import { AdapterRegistry } from '@/adapters/registry';

export interface NotificationServiceDependencies {
  adapterRegistry: AdapterRegistry;
  userService: UserService;
  provider?: NotificationDataProvider;
}

export function createNotificationService(deps: NotificationServiceDependencies): NotificationService {
  const { adapterRegistry, userService, provider } = deps;
  const notificationProvider = provider || adapterRegistry.getAdapter<NotificationDataProvider>('notification');
  return new DefaultNotificationService(notificationProvider, userService);
}