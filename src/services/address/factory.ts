/**
 * Address Service Factory for API Routes
 * 
 * This file provides factory functions for creating address services for use in API routes.
 * It ensures consistent configuration and dependency injection across all API endpoints.
 */

import { AddressService } from '@/core/address/interfaces';
import { UserManagementConfiguration } from '@/core/config';
import type { IAddressDataProvider } from '@/core/address';
import { AdapterRegistry } from '@/adapters/registry';
import { DefaultAddressService } from './default-address.service';
import { getServiceContainer, getServiceConfiguration } from '@/lib/config/service-container';

export interface ApiAddressServiceOptions {
  /** Reset cached instances, mainly for testing */
  reset?: boolean;
}

// Singleton instances for API routes
const COMPANY_CACHE_KEY = '__UM_COMPANY_ADDRESS_SERVICE__';
const PERSONAL_CACHE_KEY = '__UM_PERSONAL_ADDRESS_SERVICE__';

let addressServiceInstance: AddressService | null = null;
let personalAddressServiceInstance: AddressService | null = null;
let constructingCompany = false;
let constructingPersonal = false;

/**
 * Get the configured address service instance for API routes (User/personal addresses)
 *
 * @returns Configured AddressService instance
 */
export function getApiAddressService(
  options: ApiAddressServiceOptions = {}
): AddressService {
  if (options.reset) {
    addressServiceInstance = null;
    if (typeof globalThis !== 'undefined') {
      delete (globalThis as any)[COMPANY_CACHE_KEY];
    }
  }

  if (!addressServiceInstance && typeof globalThis !== 'undefined') {
    addressServiceInstance = (globalThis as any)[COMPANY_CACHE_KEY] as AddressService | null;
  }

  if (!addressServiceInstance && !constructingCompany) {
    constructingCompany = true;
    const existing = getServiceContainer().address;
    if (existing) {
      addressServiceInstance = existing;
    }
    constructingCompany = false;
  }

  if (!addressServiceInstance) {
    const config = getServiceConfiguration();
    const override =
      (config as any).addressService ??
      UserManagementConfiguration.getServiceProvider('addressService');

    if (override) {
      addressServiceInstance = override as AddressService;
    } else {
      const provider = AdapterRegistry.getInstance().getAdapter<IAddressDataProvider>('address');
      addressServiceInstance = new DefaultAddressService(provider);
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

  if (!personalAddressServiceInstance && !constructingPersonal) {
    constructingPersonal = true;
    const configService = UserManagementConfiguration.getServiceProvider('personalAddressService') as AddressService | undefined;
    if (configService) {
      personalAddressServiceInstance = configService;
    }
    constructingPersonal = false;
  }

  if (!personalAddressServiceInstance) {
    const provider = AdapterRegistry.getInstance().getAdapter<IAddressDataProvider>('address');
    personalAddressServiceInstance = new DefaultAddressService(provider);
  }

  if (personalAddressServiceInstance && typeof globalThis !== 'undefined') {
    (globalThis as any)[PERSONAL_CACHE_KEY] = personalAddressServiceInstance;
  }

  return personalAddressServiceInstance;
}
