/**
 * Platform Abstraction Layer
 * 
 * Provides a consistent interface for platform-specific functionality
 * to handle differences between server and client environments.
 * 
 * This is a core module that provides platform-agnostic interfaces
 * for environment-specific functionality.
 */

export * from "./interfaces";

/**
 * Server-side storage implementation for SSR
 */
export class ServerStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

/**
 * Check if code is running on the server
 */
export const isServer = typeof window === 'undefined';

/**
 * Check if code is running on the client
 */
export const isClient = !isServer;

/**
 * Get storage instance based on environment
 * 
 * @param type Type of storage ('local' or 'session')
 * @returns Storage instance (localStorage, sessionStorage, or ServerStorage for SSR)
 */
export const getStorage = (type: 'local' | 'session' = 'local'): Storage => {
  if (isServer) return new ServerStorage();
  
  try {
    const storage = type === 'local' ? window.localStorage : window.sessionStorage;
    // Test storage access
    const testKey = `storage_test_${Date.now()}`;
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return storage;
  } catch (e) {
    // If storage access fails (e.g., in private browsing), return in-memory storage
    return new ServerStorage();
  }
};

/**
 * Get the current request context (for server-side usage)
 * This should be populated by the server-side rendering context
 */
let requestContext: Record<string, any> = {};

export const getRequestContext = () => requestContext;

export const setRequestContext = (context: Record<string, any>) => {
  requestContext = { ...requestContext, ...context };
};

/**
 * Execute code only on the client side
 * 
 * @param callback Function to execute on client side
 * @param fallback Return value for server-side rendering (default: undefined)
 */
export const clientOnly = <T = void>(
  callback: () => T,
  fallback?: T
): T | undefined => {
  if (isClient) {
    return callback();
  }
  return fallback;
};

/**
 * Execute code only on the server side
 * 
 * @param callback Function to execute on server side
 * @param fallback Return value for client-side rendering (default: undefined)
 */
export const serverOnly = <T = void>(
  callback: () => T,
  fallback?: T
): T | undefined => {
  if (isServer) {
    return callback();
  }
  return fallback;
};
