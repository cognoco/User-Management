/**
 * Address Service Factory for API Routes
 * 
 * This file provides factory functions for creating address services for use in API routes.
 * It ensures consistent configuration and dependency injection across all API endpoints.
 */

import { CompanyAddressService, AddressService } from '@/core/address/interfaces';
import { UserManagementConfiguration } from '@/core/config';
import type { IAddressDataProvider } from '@/core/address';
import { AdapterRegistry } from '@/adapters/registry';
import { DefaultAddressService } from './default-address.service';
// Service container import removed - using new pure factory pattern

export interface ApiAddressServiceOptions {
  /** Reset cached instances, mainly for testing */
  reset?: boolean;
}

// Singleton instances for API routes
const COMPANY_CACHE_KEY = '__UM_COMPANY_ADDRESS_SERVICE__';
const PERSONAL_CACHE_KEY = '__UM_PERSONAL_ADDRESS_SERVICE__';

let addressServiceInstance: CompanyAddressService | null = null;
let personalAddressServiceInstance: AddressService | null = null;

/**
 * Get the configured address service instance for API routes (Company addresses)
 * 
 * @returns Configured CompanyAddressService instance
 */
export function getApiAddressService(
  options: ApiAddressServiceOptions = {}
): CompanyAddressService {
  if (options.reset) {
    addressServiceInstance = null;
    if (typeof globalThis !== 'undefined') {
      delete (globalThis as any)[COMPANY_CACHE_KEY];
    }
  }

  if (!addressServiceInstance && typeof globalThis !== 'undefined') {
    addressServiceInstance = (globalThis as any)[COMPANY_CACHE_KEY] as CompanyAddressService | null;
  }

  if (!addressServiceInstance) {
    // Check service container first (for tests and dynamic configuration)
    try {
      const { getServiceContainer } = require('@/lib/config/service-container');
      const container = getServiceContainer();
      if (container.address) {
        addressServiceInstance = container.address as CompanyAddressService;
      }
    } catch {
      // Service container not available or service not configured
    }

    // If not in service container, check UserManagementConfiguration
    if (!addressServiceInstance) {
      const override = UserManagementConfiguration.getServiceProvider('addressService');
      if (override) {
        addressServiceInstance = override as CompanyAddressService;
      }
    }

    // If still not configured, create default with adapter
    if (!addressServiceInstance) {
      const provider = AdapterRegistry.getInstance().getAdapter<IAddressDataProvider>('address');
      addressServiceInstance = new DefaultAddressService(provider) as unknown as CompanyAddressService;
    }
  }

  if (addressServiceInstance && typeof globalThis !== 'undefined') {
    (globalThis as any)[COMPANY_CACHE_KEY] = addressServiceInstance;
  }

  return addressServiceInstance;
}

/**
 * Get the configured personal address service instance for API routes (User addresses)
 * 
 * @returns Configured AddressService instance
 */
export function getApiPersonalAddressService(
  options: ApiAddressServiceOptions = {}
): AddressService {
  if (options.reset) {
    personalAddressServiceInstance = null;
    if (typeof globalThis !== 'undefined') {
      delete (globalThis as any)[PERSONAL_CACHE_KEY];
    }
  }

  if (!personalAddressServiceInstance && typeof globalThis !== 'undefined') {
    personalAddressServiceInstance = (globalThis as any)[PERSONAL_CACHE_KEY] as AddressService | null;
  }

  if (!personalAddressServiceInstance) {
    const configService = UserManagementConfiguration.getServiceProvider('personalAddressService') as AddressService | undefined;
    if (configService) {
      personalAddressServiceInstance = configService;
    } else {
      const provider = AdapterRegistry.getInstance().getAdapter<IAddressDataProvider>('address');
      personalAddressServiceInstance = new DefaultAddressService(provider);
    }
  }

  if (personalAddressServiceInstance && typeof globalThis !== 'undefined') {
    (globalThis as any)[PERSONAL_CACHE_KEY] = personalAddressServiceInstance;
  }

  return personalAddressServiceInstance;
}
