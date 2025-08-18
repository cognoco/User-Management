/**
 * Redis client abstraction
 * In production, this would connect to a real Redis instance
 * For development, we use an in-memory implementation
 */

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  setex(key: string, seconds: number, value: string): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  ttl(key: string): Promise<number>;
  exists(key: string): Promise<boolean>;
}

class InMemoryRedis implements RedisClient {
  private store: Map<string, { value: string; expiresAt?: number }> = new Map();
  private counters: Map<string, number> = new Map();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    
    if (!item) {
      return null;
    }

    // Check expiry
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, { value });
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + seconds * 1000
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
    this.counters.delete(key);
  }

  async incr(key: string): Promise<number> {
    const current = this.counters.get(key) || 0;
    const newValue = current + 1;
    this.counters.set(key, newValue);
    return newValue;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const item = this.store.get(key);
    if (item) {
      item.expiresAt = Date.now() + seconds * 1000;
    }
  }

  async ttl(key: string): Promise<number> {
    const item = this.store.get(key);
    
    if (!item || !item.expiresAt) {
      return -1;
    }

    const ttl = Math.floor((item.expiresAt - Date.now()) / 1000);
    return ttl > 0 ? ttl : -1;
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  // Cleanup expired items periodically
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt && item.expiresAt < now) {
        this.store.delete(key);
      }
    }
  }

  constructor() {
    // Run cleanup every minute
    setInterval(() => this.cleanup(), 60000);
  }
}

class ProductionRedis implements RedisClient {
  private client: any; // Would be the actual Redis client

  constructor() {
    // In production, initialize real Redis client
    // Example with ioredis:
    // this.client = new Redis({
    //   host: process.env.REDIS_HOST,
    //   port: process.env.REDIS_PORT,
    //   password: process.env.REDIS_PASSWORD
    // });
    
    throw new Error('Production Redis not configured. Please set up Redis connection.');
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    await this.client.set(key, value);
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    await this.client.setex(key, seconds, value);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }
}

// Export singleton instance
export const redis: RedisClient = 
  process.env.NODE_ENV === 'production' && process.env.REDIS_URL
    ? new ProductionRedis()
    : new InMemoryRedis();

// Export types
export type { RedisClient };