/**
 * Secure Storage Service
 * 
 * Provides encrypted storage for sensitive client-side data
 * with automatic encryption/decryption and key management.
 */

import { sessionEncryption, type EncryptedData } from '@/lib/crypto/session-encryption';
import { debug, warn, error as logError } from '@/lib/utils/logger';

export interface SecureStorageOptions {
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** Whether to encrypt the data */
  encrypt?: boolean;
  /** Storage prefix for namespacing */
  prefix?: string;
}

/**
 * Storage entry with metadata
 */
interface StorageEntry<T = any> {
  data: T | EncryptedData;
  encrypted: boolean;
  expires?: number;
  created: number;
  version: 1;
}

/**
 * Secure storage service for sensitive data
 */
export class SecureStorageService {
  private static instance: SecureStorageService;
  private readonly defaultPrefix = 'secure_';
  private readonly defaultTTL = 24 * 60 * 60 * 1000; // 24 hours
  private initialized = false;
  private userId: string | null = null;
  private sessionId: string | null = null;

  private constructor() {}

  static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  /**
   * Initialize secure storage with user context
   */
  async initialize(userId: string, sessionId: string): Promise<void> {
    if (this.initialized && this.userId === userId && this.sessionId === sessionId) {
      return;
    }

    this.userId = userId;
    this.sessionId = sessionId;

    try {
      await sessionEncryption.initializeKey(userId, sessionId);
      this.initialized = true;
      debug('secure-storage', 'Initialized with encryption');
    } catch (err) {
      warn('secure-storage', 'Failed to initialize encryption, falling back to plain storage');
      this.initialized = true; // Still mark as initialized, but without encryption
    }
  }

  /**
   * Store data securely
   */
  async setItem<T>(
    key: string, 
    value: T, 
    options: SecureStorageOptions = {}
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      warn('secure-storage', 'Storage not available');
      return false;
    }

    const {
      ttl = this.defaultTTL,
      encrypt = true,
      prefix = this.defaultPrefix
    } = options;

    const storageKey = `${prefix}${key}`;

    try {
      let dataToStore: T | EncryptedData = value;
      let isEncrypted = false;

      // Encrypt sensitive data if requested and available
      if (encrypt && this.initialized && this.userId && this.sessionId) {
        const encrypted = await sessionEncryption.encrypt(value);
        if (encrypted) {
          dataToStore = encrypted;
          isEncrypted = true;
        }
      }

      const entry: StorageEntry = {
        data: dataToStore,
        encrypted: isEncrypted,
        expires: ttl > 0 ? Date.now() + ttl : undefined,
        created: Date.now(),
        version: 1
      };

      localStorage.setItem(storageKey, JSON.stringify(entry));
      debug('secure-storage', `Stored ${isEncrypted ? 'encrypted' : 'plain'} data for key: ${key}`);
      return true;
    } catch (err) {
      logError('secure-storage', `Failed to store data for key: ${key}`, err as Error);
      return false;
    }
  }

  /**
   * Retrieve data securely
   */
  async getItem<T>(key: string, prefix = this.defaultPrefix): Promise<T | null> {
    if (!this.isAvailable()) {
      return null;
    }

    const storageKey = `${prefix}${key}`;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return null;
      }

      const entry: StorageEntry = JSON.parse(raw);

      // Check version
      if (entry.version !== 1) {
        warn('secure-storage', `Unsupported storage version for key: ${key}`);
        this.removeItem(key, prefix);
        return null;
      }

      // Check expiration
      if (entry.expires && entry.expires < Date.now()) {
        debug('secure-storage', `Data expired for key: ${key}`);
        this.removeItem(key, prefix);
        return null;
      }

      // Decrypt if necessary
      if (entry.encrypted && sessionEncryption.isValidEncryptedData(entry.data)) {
        const decrypted = await sessionEncryption.decrypt(entry.data as EncryptedData);
        if (decrypted === null) {
          warn('secure-storage', `Failed to decrypt data for key: ${key}`);
          this.removeItem(key, prefix);
          return null;
        }
        return decrypted as T;
      }

      return entry.data as T;
    } catch (err) {
      logError('secure-storage', `Failed to retrieve data for key: ${key}`, err as Error);
      return null;
    }
  }

  /**
   * Remove item from storage
   */
  removeItem(key: string, prefix = this.defaultPrefix): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const storageKey = `${prefix}${key}`;
      localStorage.removeItem(storageKey);
      debug('secure-storage', `Removed data for key: ${key}`);
      return true;
    } catch (err) {
      logError('secure-storage', `Failed to remove data for key: ${key}`, err as Error);
      return false;
    }
  }

  /**
   * Clear all secure storage items
   */
  clear(prefix = this.defaultPrefix): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const keys = Object.keys(localStorage);
      let cleared = 0;

      for (const key of keys) {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
          cleared++;
        }
      }

      debug('secure-storage', `Cleared ${cleared} items with prefix: ${prefix}`);
      return true;
    } catch (err) {
      logError('secure-storage', 'Failed to clear storage', err as Error);
      return false;
    }
  }

  /**
   * Clean up expired entries
   */
  async cleanup(prefix = this.defaultPrefix): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    const keys = Object.keys(localStorage);
    let cleaned = 0;

    for (const key of keys) {
      if (!key.startsWith(prefix)) {
        continue;
      }

      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;

        const entry: StorageEntry = JSON.parse(raw);
        
        // Remove expired entries
        if (entry.expires && entry.expires < Date.now()) {
          localStorage.removeItem(key);
          cleaned++;
        }
        
        // Remove old encrypted data if we can't decrypt it
        if (entry.encrypted && this.initialized) {
          const canDecrypt = await sessionEncryption.decrypt(entry.data as EncryptedData);
          if (canDecrypt === null) {
            localStorage.removeItem(key);
            cleaned++;
          }
        }
      } catch {
        // Remove corrupted entries
        localStorage.removeItem(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      debug('secure-storage', `Cleaned up ${cleaned} expired/corrupted entries`);
    }

    return cleaned;
  }

  /**
   * Reset secure storage (on logout)
   */
  reset(): void {
    this.clear();
    sessionEncryption.clearKey();
    this.initialized = false;
    this.userId = null;
    this.sessionId = null;
    debug('secure-storage', 'Storage reset');
  }

  /**
   * Check if storage is available
   */
  private isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.localStorage;
  }

  /**
   * Get storage statistics
   */
  getStats(prefix = this.defaultPrefix): {
    totalItems: number;
    encryptedItems: number;
    expiredItems: number;
    totalSize: number;
  } {
    if (!this.isAvailable()) {
      return { totalItems: 0, encryptedItems: 0, expiredItems: 0, totalSize: 0 };
    }

    const keys = Object.keys(localStorage);
    let totalItems = 0;
    let encryptedItems = 0;
    let expiredItems = 0;
    let totalSize = 0;

    for (const key of keys) {
      if (!key.startsWith(prefix)) {
        continue;
      }

      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;

        totalItems++;
        totalSize += raw.length;

        const entry: StorageEntry = JSON.parse(raw);
        
        if (entry.encrypted) {
          encryptedItems++;
        }
        
        if (entry.expires && entry.expires < Date.now()) {
          expiredItems++;
        }
      } catch {
        // Ignore corrupted entries
      }
    }

    return { totalItems, encryptedItems, expiredItems, totalSize };
  }
}

// Export singleton instance
export const secureStorage = SecureStorageService.getInstance();