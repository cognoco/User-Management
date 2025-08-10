/**
 * Pure Company Notification Service Factory
 */

import type { CompanyNotificationService } from '@/core/company-notification/interfaces';
import type { NotificationService } from '@/core/notification/interfaces';
import type { ICompanyNotificationDataProvider } from '@/core/company-notification';
import { DefaultCompanyNotificationService } from './default-company-notification.service';
import { AdapterRegistry } from '@/adapters/registry';

export interface CompanyNotificationServiceDependencies {
  adapterRegistry: AdapterRegistry;
  notificationService?: NotificationService;
  provider?: ICompanyNotificationDataProvider;
}

export function createCompanyNotificationService(deps: CompanyNotificationServiceDependencies): CompanyNotificationService {
  const { adapterRegistry, notificationService, provider } = deps;
  const companyNotificationProvider = provider || adapterRegistry.getAdapter<ICompanyNotificationDataProvider>('companyNotification');
  return new DefaultCompanyNotificationService(companyNotificationProvider, notificationService);
}