import { AddressService } from '@/core/address/interfaces';
import type { IAddressDataProvider } from '@/core/address/IAddressDataProvider';
import type {
  CompanyAddress,
  AddressCreatePayload,
  AddressUpdatePayload,
  AddressResult
} from '@/core/address/models';
import type { Address } from '@/core/address/types';

/**
 * Default implementation of the {@link AddressService} interface.
 *
 * This service translates between user level address objects and the
 * data provider which works with company style addresses.
 */
export class DefaultAddressService implements AddressService {
  constructor(private provider: IAddressDataProvider) {}

  private mapToAddress(data: CompanyAddress): Address {
    return {
      id: data.id,
      userId: data.company_id,
      type: (data.type as 'billing' | 'shipping') ?? 'shipping',
      isDefault: data.is_primary,
      fullName: '',
      company: undefined,
      street1: data.street_line1,
      street2: data.street_line2,
      city: data.city,
      state: data.state ?? '',
      postalCode: data.postal_code,
      country: data.country,
      phone: undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private toCreatePayload(address: Omit<Address, 'id' | 'createdAt' | 'updatedAt'>): AddressCreatePayload {
    return {
      type: address.type === 'both' ? 'shipping' : address.type,
      street_line1: address.street1,
      street_line2: address.street2,
      city: address.city,
      state: address.state,
      postal_code: address.postalCode,
      country: address.country,
      is_primary: address.isDefault,
      validated: false
    };
  }

  private toUpdatePayload(updates: Partial<Address>): AddressUpdatePayload {
    return {
      type: updates.type && updates.type !== 'both' ? updates.type : undefined,
      street_line1: updates.street1,
      street_line2: updates.street2,
      city: updates.city,
      state: updates.state,
      postal_code: updates.postalCode,
      country: updates.country,
      is_primary: updates.isDefault,
      validated: undefined
    };
  }

  /** @inheritdoc */
  async getAddresses(userId: string): Promise<Address[]> {
    const result = await this.provider.getAddresses(userId);
    const list = Array.isArray(result) ? result : (result as any).addresses ?? [];
    return list.map((a: any) => this.mapToAddress(a));
  }

  /** @inheritdoc */
  async getAddress(id: string, userId: string): Promise<Address> {
    const result = await this.provider.getAddresses(userId);
    const list = Array.isArray(result) ? result : (result as any).addresses ?? [];
    const found = list.find((a: any) => a.id === id);
    if (!found) {
      throw new Error('Address not found');
    }
    return this.mapToAddress(found);
  }

  /** @inheritdoc */
  async createAddress(address: Omit<Address, 'id' | 'createdAt' | 'updatedAt'>): Promise<Address> {
    const result: AddressResult = await this.provider.createAddress(
      address.userId,
      this.toCreatePayload(address)
    );
    if (!result.success || !result.address) {
      throw new Error(result.error || 'Failed to create address');
    }
    return this.mapToAddress(result.address);
  }

  /** @inheritdoc */
  async updateAddress(id: string, updates: Partial<Address>, userId: string): Promise<Address> {
    const result = await this.provider.updateAddress(userId, id, this.toUpdatePayload(updates));
    if (!result.success || !result.address) {
      throw new Error(result.error || 'Failed to update address');
    }
    return this.mapToAddress(result.address);
  }

  /** @inheritdoc */
  async deleteAddress(id: string, userId: string): Promise<void> {
    const result = await this.provider.deleteAddress(userId, id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete address');
    }
  }

  /** @inheritdoc */
  async setDefaultAddress(id: string, userId: string): Promise<void> {
    await this.provider.updateAddress(userId, id, { is_primary: true });
  }
}
