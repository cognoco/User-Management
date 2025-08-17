/**
 * React Hook for Secure Storage
 * 
 * Provides a React-friendly interface to the secure storage service
 * with automatic initialization and cleanup.
 */

import { useEffect, useCallback, useState } from 'react';
import { secureStorage, type SecureStorageOptions } from '@/services/auth/secure-storage.service';
import { useAuthStore } from '@/stores/auth.store';
import { debug } from '@/lib/utils/logger';

export interface UseSecureStorageOptions extends SecureStorageOptions {
  /** Auto-initialize on mount */
  autoInit?: boolean;
  /** Auto-cleanup expired entries */
  autoCleanup?: boolean;
  /** Cleanup interval in milliseconds */
  cleanupInterval?: number;
}

/**
 * Hook for secure storage operations
 */
export function useSecureStorage(options: UseSecureStorageOptions = {}) {
  const {
    autoInit = true,
    autoCleanup = true,
    cleanupInterval = 60 * 60 * 1000, // 1 hour
    ...storageOptions
  } = options;

  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize secure storage when user is authenticated
  useEffect(() => {
    if (!autoInit || !user?.id || !token) {
      return;
    }

    const initStorage = async () => {
      setLoading(true);
      try {
        // Use token as session ID for key derivation
        await secureStorage.initialize(user.id, token);
        setInitialized(true);
        debug('useSecureStorage', 'Storage initialized');
      } catch (error) {
        console.error('Failed to initialize secure storage:', error);
      } finally {
        setLoading(false);
      }
    };

    initStorage();
  }, [autoInit, user?.id, token]);

  // Auto-cleanup expired entries
  useEffect(() => {
    if (!autoCleanup || !initialized) {
      return;
    }

    const cleanup = async () => {
      const cleaned = await secureStorage.cleanup();
      if (cleaned > 0) {
        debug('useSecureStorage', `Auto-cleaned ${cleaned} expired entries`);
      }
    };

    // Initial cleanup
    cleanup();

    // Set up interval for periodic cleanup
    const interval = setInterval(cleanup, cleanupInterval);

    return () => clearInterval(interval);
  }, [autoCleanup, cleanupInterval, initialized]);

  // Reset storage on logout
  useEffect(() => {
    if (!user && initialized) {
      secureStorage.reset();
      setInitialized(false);
      debug('useSecureStorage', 'Storage reset on logout');
    }
  }, [user, initialized]);

  /**
   * Store item securely
   */
  const setItem = useCallback(async <T>(
    key: string,
    value: T,
    customOptions?: SecureStorageOptions
  ): Promise<boolean> => {
    if (!initialized && user?.id && token) {
      await secureStorage.initialize(user.id, token);
      setInitialized(true);
    }

    return secureStorage.setItem(key, value, {
      ...storageOptions,
      ...customOptions
    });
  }, [initialized, user?.id, token, storageOptions]);

  /**
   * Retrieve item securely
   */
  const getItem = useCallback(async <T>(
    key: string,
    prefix?: string
  ): Promise<T | null> => {
    return secureStorage.getItem<T>(key, prefix || storageOptions.prefix);
  }, [storageOptions.prefix]);

  /**
   * Remove item from storage
   */
  const removeItem = useCallback((
    key: string,
    prefix?: string
  ): boolean => {
    return secureStorage.removeItem(key, prefix || storageOptions.prefix);
  }, [storageOptions.prefix]);

  /**
   * Clear all items with prefix
   */
  const clear = useCallback((prefix?: string): boolean => {
    return secureStorage.clear(prefix || storageOptions.prefix);
  }, [storageOptions.prefix]);

  /**
   * Get storage statistics
   */
  const getStats = useCallback(() => {
    return secureStorage.getStats(storageOptions.prefix);
  }, [storageOptions.prefix]);

  /**
   * Manual cleanup of expired entries
   */
  const cleanup = useCallback(async (): Promise<number> => {
    return secureStorage.cleanup(storageOptions.prefix);
  }, [storageOptions.prefix]);

  return {
    initialized,
    loading,
    setItem,
    getItem,
    removeItem,
    clear,
    cleanup,
    getStats,
    reset: () => secureStorage.reset()
  };
}

/**
 * Hook for storing user preferences securely
 */
export function useUserPreferences<T extends Record<string, any>>(
  defaultPreferences: T
) {
  const { initialized, setItem, getItem } = useSecureStorage({
    prefix: 'prefs_',
    ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
    encrypt: false // Preferences don't need encryption
  });

  const [preferences, setPreferences] = useState<T>(defaultPreferences);
  const [loaded, setLoaded] = useState(false);

  // Load preferences on initialization
  useEffect(() => {
    if (!initialized) return;

    const loadPreferences = async () => {
      const stored = await getItem<T>('user');
      if (stored) {
        setPreferences({ ...defaultPreferences, ...stored });
      }
      setLoaded(true);
    };

    loadPreferences();
  }, [initialized, getItem, defaultPreferences]);

  // Update preference
  const updatePreference = useCallback(async <K extends keyof T>(
    key: K,
    value: T[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    
    if (initialized) {
      await setItem('user', newPreferences);
    }
  }, [preferences, initialized, setItem]);

  // Reset to defaults
  const resetPreferences = useCallback(async () => {
    setPreferences(defaultPreferences);
    
    if (initialized) {
      await setItem('user', defaultPreferences);
    }
  }, [defaultPreferences, initialized, setItem]);

  return {
    preferences,
    loaded,
    updatePreference,
    resetPreferences
  };
}

/**
 * Hook for temporary session data with encryption
 */
export function useSessionData<T = any>(key: string, initialValue?: T) {
  const { initialized, setItem, getItem, removeItem } = useSecureStorage({
    prefix: 'session_',
    ttl: 4 * 60 * 60 * 1000, // 4 hours
    encrypt: true // Session data should be encrypted
  });

  const [data, setData] = useState<T | undefined>(initialValue);
  const [loading, setLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    if (!initialized) return;

    const loadData = async () => {
      setLoading(true);
      const stored = await getItem<T>(key);
      if (stored !== null) {
        setData(stored);
      }
      setLoading(false);
    };

    loadData();
  }, [initialized, key, getItem]);

  // Update data
  const updateData = useCallback(async (newData: T) => {
    setData(newData);
    
    if (initialized) {
      await setItem(key, newData);
    }
  }, [initialized, key, setItem]);

  // Clear data
  const clearData = useCallback(() => {
    setData(undefined);
    
    if (initialized) {
      removeItem(key);
    }
  }, [initialized, key, removeItem]);

  return {
    data,
    loading,
    updateData,
    clearData
  };
}