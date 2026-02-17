import { type NextRequest, NextResponse } from 'next/server';
import { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
import { rateLimitConfig, redisConfig } from '@/lib/config'; // Adjust path as needed
import { LRUCache } from 'lru-cache';
import { ApiError, ERROR_CODES } from '@/lib/api/common';

// Initialize Redis client if configured
let redis: Redis | null = null;
if (redisConfig.enabled && redisConfig.url && redisConfig.token) {
  redis = new Redis({
    url: redisConfig.url,
    token: redisConfig.token,
  });
} else {
  console.warn(
    'Rate limiting is disabled: Redis URL or Token not configured in environment variables.'
  );
}

/** Basic configuration for rate limiting logic */
interface RateLimitConfig {
  windowMs: number;
  max: number;
  enabled: boolean;
}

/** Options passed to {@link rateLimit} */
export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyPrefix?: string;
  enabled?: boolean;
}

// Configure rate limiting options
const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  enabled: true,
};

// Create a cache to store rate limit data
// Attempt instantiation using the named import directly
const rateLimitCache = new LRUCache({
  max: 500, // Maximum number of items to store
  ttl: defaultConfig.windowMs, // Time to live
});

/**
 * Checks if the current request exceeds the rate limit.
 * 
 * @param request The incoming NextRequest object.
 * @param options Optional configuration for rate limiting.
 * @returns Promise<boolean> - True if rate limited, false otherwise.
 */
export async function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions = {} // Use the new options type
): Promise<boolean> {
  console.log('REAL checkRateLimit CALLED');
  if (options.enabled === false || !rateLimitConfig.enabled) {
    return false;
  }

  if (!redis) {
    return false; // Not rate limited if Redis is not available
  }

  const { 
    windowMs = rateLimitConfig.windowMs,
    max = rateLimitConfig.max,
    keyPrefix = 'rate-limit'
  } = { ...defaultConfig, ...options }; // Merge with defaults

  // Generate a unique key based on IP address
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown-ip';
  const key = `${keyPrefix}:${ip}`;
  
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Use a Redis transaction for atomicity
    const multi = redis.multi();

    // Remove old entries (score < windowStart)
    multi.zremrangebyscore(key, 0, windowStart);
    // Add current request timestamp
    multi.zadd(key, { score: now, member: now.toString() });
    // Get the count of entries in the current window
    multi.zcount(key, windowStart, now);
    // Set expiry for the key to clean up if inactive
    multi.expire(key, Math.ceil(windowMs / 1000));

    const results = await multi.exec<[number, number, number, number]>();
    
    // results[2] should contain the count from zcount
    const currentHits = results[2]; 

    if (currentHits > max) {
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return true; // Rate limited
    }

    return false; // Not rate limited

  } catch (error) {
    console.error('Redis rate limit check error:', error);
    // Fail open - do not rate limit if Redis check fails
    return false; 
  }
}

// Function to get rate limit headers (can be called by route handler)
export function getRateLimitHeaders(key: string, options: RateLimitOptions = {}): Record<string, string> { // Use the new options type
    // Placeholder implementation:
    const { max = rateLimitConfig.max, windowMs = rateLimitConfig.windowMs } = { ...defaultConfig, ...options }; // Merge with defaults
    return {
        // Add headers back if needed, ensuring values are used
        'X-RateLimit-Limit': max.toString(),
        // 'X-RateLimit-Remaining': 'unknown', // Still hard to calculate remaining accurately here
        'X-RateLimit-Reset': Math.ceil((Date.now() + windowMs) / 1000).toString()
    };
}

/**
 * Create an API rate limiting middleware.
 *
 * @param options Optional {@link RateLimitOptions} to override defaults.
 * @param injectedCheckRateLimit Dependency injection for testing.
 */
export function rateLimit(options: RateLimitOptions = {}, injectedCheckRateLimit = checkRateLimit) {
  return async function rateLimitMiddleware(
    req: NextApiRequest,
    res: NextApiResponse,
    next: () => Promise<void>
  ) {
    try {
      if (options.enabled === false || !rateLimitConfig.enabled) {
        await next();
        return;
      }

      const isRateLimited = await injectedCheckRateLimit(
        req as unknown as NextRequest,
        options
      );
      
      if (isRateLimited) {
        const error = new ApiError(
          ERROR_CODES.OPERATION_FAILED,
          'Too many requests, please try again later.',
          429
        );
        res.status(429).json(error.toResponse());
        return;
      }

      // Add rate limit headers
      const clientIp = req.socket.remoteAddress || 
                      req.headers['x-forwarded-for'] as string || 
                      'unknown';
      const headers = getRateLimitHeaders(clientIp, options);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      await next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      await next();
    }
  };
}

/**
 * Rate limiting middleware that uses in-memory LRU cache
 * For production, consider using Redis or a similar distributed cache
 */
export async function withRateLimit(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: RateLimitOptions = {} // Use the new options type
): Promise<NextResponse> {
  const mergedConfig = { ...defaultConfig, ...config };
  if (mergedConfig.enabled === false || !rateLimitConfig.enabled) {
    return handler(request);
  }
  try {
    // Get client IP
    const ip = request.ip || 
               request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') ||
               '127.0.0.1';

    // Get current count for this IP
    const tokenCount = rateLimitCache.get(ip) || 0;

    // Check if rate limit is exceeded
    if (tokenCount >= mergedConfig.max) { // Use merged config
      const error = new ApiError(
        ERROR_CODES.OPERATION_FAILED,
        'Too many requests, please try again later.',
        429,
        { retryAfter: Math.ceil(mergedConfig.windowMs / 1000) }
      );
      return new NextResponse(JSON.stringify(error.toResponse()), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(mergedConfig.windowMs / 1000))
        }
      });
    }

    // Increment the count
    rateLimitCache.set(ip, tokenCount + 1);

    // Process the request
    return handler(request);
  } catch (error) {
    console.error('Rate limiting error:', error);
    // If rate limiting fails, still process the request
    return handler(request);
  }
}

/**
 * Creates a rate limit middleware with custom configuration
 */
export function createRateLimit(options?: RateLimitOptions) { // Use the new options type
  const config = { ...defaultConfig, ...rateLimitConfig, ...options };

  return async function rateLimit(
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
  ) {
    return withRateLimit(request, handler, config);
  };
}

