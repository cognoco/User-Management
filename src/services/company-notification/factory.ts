import { DefaultCompanyNotificationService } from './default-company-notification.service';
import type { CompanyNotificationService } from '@/core/company-notification/interfaces';
// Service container import removed - using new pure factory pattern

export interface ApiCompanyNotificationServiceOptions {
  reset?: boolean;
}

let instance: CompanyNotificationService | null = null;

export function getApiCompanyNotificationService(
  options: ApiCompanyNotificationServiceOptions = {}
): CompanyNotificationService {
  if (options.reset) {
    instance = null;
  }

  if (!instance) {
    instance = new DefaultCompanyNotificationService();
  }

  return instance;
}
