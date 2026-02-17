import type { FileStorageService } from '../../core/storage/services';
import { DefaultFileStorageService } from './DefaultFileStorageService';
import { AdapterRegistry } from '../../adapters/registry';
import type { StorageAdapter } from '../../core/storage/interfaces';

export function createStorageService(): FileStorageService {
  const adapter = AdapterRegistry.getInstance().getAdapter<StorageAdapter>('storage');
  return new DefaultFileStorageService(adapter);
}

export function getStorageService(): FileStorageService {
  return createStorageService();
}
