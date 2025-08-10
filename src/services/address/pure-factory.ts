/**
 * Pure Address Service Factory
 */

import type { CompanyAddressService } from '@/core/address/interfaces';
import type { IAddressDataProvider } from '@/core/address';
import { DefaultAddressService } from './default-address.service';
import { AdapterRegistry } from '@/adapters/registry';

export interface AddressServiceDependencies {
  adapterRegistry: AdapterRegistry;
  provider?: IAddressDataProvider;
}

export function createAddressService(deps: AddressServiceDependencies): CompanyAddressService {
  const { adapterRegistry, provider } = deps;
  const addressProvider = provider || adapterRegistry.getAdapter<IAddressDataProvider>('address');
  return new DefaultAddressService(addressProvider);
}