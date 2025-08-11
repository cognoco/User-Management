/**
 * Notifications Service Factory for API Routes
 * 
 * This file provides factory functions for creating notification services for use in API routes.
 * It ensures consistent configuration and dependency injection across all API endpoints.
 */

import { NotificationService } from '@/core/notification/interfaces';
import type { INotificationDataProvider } from '@/core/notification';
import { DefaultNotificationService } from './default-notification.service';
import { DefaultNotificationHandler } from './default-notification.handler';
import { AdapterRegistry } from '@/adapters/registry';
import { UserManagementConfiguration } from '@/core/config';
// Service container import removed - using new pure factory pattern

/** Options for {@link getApiNotificationService}. */
export interface ApiNotificationServiceOptions {
  /** When true, clears any cached instance (useful for testing). */
  reset?: boolean;
}

// Singleton instance for API routes
let notificationServiceInstance: NotificationService | null = null;

/**
 * Get the configured notification service instance for API routes
 * 
 * @returns Configured NotificationService instance
 */
export function getApiNotificationService(
  options: ApiNotificationServiceOptions = {}
): NotificationService {
  if (options.reset) {
    notificationServiceInstance = null;
  }

  if (!notificationServiceInstance) {
    const configuredService = UserManagementConfiguration.getServiceProvider('notificationService') as NotificationService | undefined;
    
    if (configuredService) {
      notificationServiceInstance = configuredService;
    } else {
      const notificationDataProvider = AdapterRegistry.getInstance().getAdapter<INotificationDataProvider>('notification');
      const handler = new DefaultNotificationHandler();
      notificationServiceInstance = new DefaultNotificationService(notificationDataProvider, handler);
    }
  }

  return notificationServiceInstance!;
}
