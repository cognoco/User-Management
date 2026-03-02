// __tests__/__mocks__/redis.js

// Mock implementation for the Redis client from @upstash/redis
export const Redis = {
  fromEnv: vi.fn().mockReturnValue({
    // Basic key-value operations
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    incrby: vi.fn().mockResolvedValue(1),
    decr: vi.fn().mockResolvedValue(0),
    decrby: vi.fn().mockResolvedValue(0),
    expire: vi.fn().mockResolvedValue(true),
    ttl: vi.fn().mockResolvedValue(3600),
    
    // Hash operations
    hget: vi.fn().mockResolvedValue(null),
    hgetall: vi.fn().mockResolvedValue({}),
    hset: vi.fn().mockResolvedValue(1),
    hdel: vi.fn().mockResolvedValue(1),
    hincrby: vi.fn().mockResolvedValue(1),
    hexists: vi.fn().mockResolvedValue(1),
    
    // List operations
    lpush: vi.fn().mockResolvedValue(1),
    rpush: vi.fn().mockResolvedValue(1),
    lpop: vi.fn().mockResolvedValue(null),
    rpop: vi.fn().mockResolvedValue(null),
    lrange: vi.fn().mockResolvedValue([]),
    
    // Set operations
    sadd: vi.fn().mockResolvedValue(1),
    srem: vi.fn().mockResolvedValue(1),
    smembers: vi.fn().mockResolvedValue([]),
    sismember: vi.fn().mockResolvedValue(1),
    
    // Sorted set operations
    zadd: vi.fn().mockResolvedValue(1),
    zrem: vi.fn().mockResolvedValue(1),
    zrange: vi.fn().mockResolvedValue([]),
    zrevrange: vi.fn().mockResolvedValue([]),
    zremrangebyscore: vi.fn().mockResolvedValue(1),
    zremrangebyrank: vi.fn().mockResolvedValue(1),
    zcount: vi.fn().mockResolvedValue(5),
    zscore: vi.fn().mockResolvedValue(1),
    
    // Transaction operations
    multi: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
    
    // PubSub operations
    publish: vi.fn().mockResolvedValue(1),
    subscribe: vi.fn().mockImplementation((channel: string, callback: (...args: any[]) => void) => {
      void channel; void callback; // suppress unused variable warnings
      return vi.fn();
    }),
    
    // Scripting
    eval: vi.fn().mockResolvedValue(null),
    
    // Pipeline
    pipeline: vi.fn().mockReturnThis(),
    
    // Database operations
    select: vi.fn().mockResolvedValue('OK'),
    flushdb: vi.fn().mockResolvedValue('OK'),
    flushall: vi.fn().mockResolvedValue('OK'),
    
    // Custom response setter for tests
    __setMockResponse: vi.fn().mockImplementation(function(this: any, method: string, response: unknown) {
      this[method].mockResolvedValue(response);
      return this;
    })
  }),
  
  // Class-based variant for when Redis is used with 'new'
  new: vi.fn().mockImplementation(() => Redis.fromEnv())
};

// Shorthand for configuring mock responses
export const configureMockRedis = (redis: Record<string, any>, configs: Record<string, any> = {}) => {
  Object.entries(configs).forEach(([method, response]) => {
    redis[method].mockResolvedValue(response);
  });
  return redis;
};
