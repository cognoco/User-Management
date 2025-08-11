/**
 * Company Service Factory for API routes.
 *
 * Provides a configured {@link CompanyService} instance with optional caching
 * and reset functionality for tests.
 */
import { UserManagementConfiguration } from '@/core/config';
import { DefaultCompanyService, type CompanyService } from './companyService';
// Service container import removed - using new pure factory pattern

/** Options for {@link getApiCompanyService}. */
export interface ApiCompanyServiceOptions {
  /** When true, clears the cached instance. */
  reset?: boolean;
}

let companyServiceInstance: CompanyService | null = null;

export function getApiCompanyService(
  options: ApiCompanyServiceOptions = {}
): CompanyService {
  if (options.reset) {
    companyServiceInstance = null;
  }

  if (!companyServiceInstance) {
    companyServiceInstance =
      (UserManagementConfiguration.getServiceProvider('companyService') as CompanyService) ||
      new DefaultCompanyService();
  }

  return companyServiceInstance;
}
