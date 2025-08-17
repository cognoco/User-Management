declare module 'lru-cache' {
  export interface LRUCacheOptions {
    max?: number;
    ttl?: number;
  }

  export class LRUCache<K = any, V = any> {
    constructor(options?: LRUCacheOptions);
    set(key: K, value: V): void;
    get(key: K): V | undefined;
    delete(key: K): void;
    clear(): void;
    has(key: K): boolean;
  }
} 