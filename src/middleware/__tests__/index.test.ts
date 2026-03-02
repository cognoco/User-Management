import { createMocks } from 'node-mocks-http';
import { combineMiddleware, createApiMiddleware, withSecurity } from '@/middleware/index';
import { rateLimit } from '@/middleware/rate-limit';
import { securityHeaders } from '@/middleware/security-headers';
import { cors } from '@/middleware/cors';
import { csrf } from '@/middleware/csrf';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the individual middleware functions
vi.mock('@/middleware/rate-limit', () => ({
  rateLimit: vi.fn(() => async (req: any, res: any, next: any) => {
    res.setHeader('X-RateLimit-Limit', '100');
    await next();
  }),
}));

vi.mock('@/middleware/security-headers', () => ({
  securityHeaders: vi.fn(() => async (req: any, res: any, next: any) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    await next();
  }),
}));

vi.mock('@/middleware/audit-log', () => ({
  auditLog: vi.fn(() => async (req: any, res: any, next: any) => {
    res.setHeader('X-Audit-Log', 'enabled');
    await next();
  }),
}));

vi.mock('@/middleware/cors', () => ({
  cors: vi.fn(() => async (req: any, res: any, next: any) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    await next();
  }),
}));

vi.mock('@/middleware/csrf', () => ({
  csrf: vi.fn(() => async (req: any, res: any, next: any) => {
    res.setHeader('X-CSRF-Token', 'setup');
    await next();
  }),
}));

describe('Middleware Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('combineMiddleware', () => {
    it('should execute middleware in the correct order', async () => {
      const { req, res } = createMocks();
      const executionOrder: string[] = [];

      const middleware1 = async (req: any, res: any, next: any) => {
        executionOrder.push('middleware1');
        await next();
      };

      const middleware2 = async (req: any, res: any, next: any) => {
        executionOrder.push('middleware2');
        await next();
      };

      const combined = combineMiddleware([middleware1, middleware2]);
      const next = vi.fn();

      await combined(req, res, next);

      expect(executionOrder).toEqual(['middleware1', 'middleware2']);
      expect(next).toHaveBeenCalled();
    });

    it('should handle errors in middleware chain', async () => {
      const { req, res } = createMocks();
      const error = new Error('Test error');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const errorMiddleware = async () => {
        throw error;
      };

      const combined = combineMiddleware([errorMiddleware]);
      const next = vi.fn();

      await combined(req, res, next);

      expect(consoleSpy).toHaveBeenCalledWith('Middleware execution error:', error);
      expect(next).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('createApiMiddleware', () => {
    it('should create middleware with default configuration', async () => {
      const { req, res } = createMocks();
      const middleware = createApiMiddleware();
      const next = vi.fn();

      await middleware(req, res, next);

      // Check all default middleware were called
      expect(cors).toHaveBeenCalled();
      expect(csrf).toHaveBeenCalled();
      expect(rateLimit).toHaveBeenCalled();
      expect(securityHeaders).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should skip specified middleware', async () => {
      const { req, res } = createMocks();
      const middleware = createApiMiddleware({
        skipMiddlewares: ['rateLimit', 'auditLog'],
      });
      const next = vi.fn();

      await middleware(req, res, next);

      expect(rateLimit).not.toHaveBeenCalled();
      expect(securityHeaders).toHaveBeenCalled();
      expect(cors).toHaveBeenCalled();
      expect(csrf).toHaveBeenCalled();
    });

    it('should pass custom options to middleware', async () => {
      const { req, res } = createMocks();
      const middleware = createApiMiddleware({
        rateLimit: { max: 50 },
        securityHeaders: { xFrameOptions: 'DENY' },
        cors: { allowedOrigins: ['https://example.com'] },
        csrf: { cookieName: 'custom-csrf' },
      });
      const next = vi.fn();

      await middleware(req, res, next);

      expect(rateLimit).toHaveBeenCalledWith({ max: 50 });
      expect(securityHeaders).toHaveBeenCalledWith({ xFrameOptions: 'DENY' });
      expect(cors).toHaveBeenCalledWith({ allowedOrigins: ['https://example.com'] });
      expect(csrf).toHaveBeenCalledWith({ cookieName: 'custom-csrf' });
    });
  });

  describe('withSecurity', () => {
    it('should wrap handler with security middleware', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });
      
      // When testing withSecurity, we need to mock the current middleware
      // implementation as it's using the defaultSecurityMiddleware
      const handler = vi.fn();
      const secureHandler = withSecurity(handler);

      await secureHandler(req, res);

      expect(handler).toHaveBeenCalledWith(req, res);
    });

    it('should use custom middleware options', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });
      const handler = vi.fn();
      const secureHandler = withSecurity(handler, {
        rateLimit: { max: 50 },
        skipMiddlewares: ['auditLog'],
      });

      await secureHandler(req, res);

      expect(handler).toHaveBeenCalledWith(req, res);
      expect(rateLimit).toHaveBeenCalledWith({ max: 50 });
    });

    it('should handle errors in the handler', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });
      const error = new Error('Handler error');
      const handler = vi.fn().mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const secureHandler = withSecurity(handler);
      await secureHandler(req, res);
      
      expect(consoleSpy).toHaveBeenCalledWith('API route error:', error);
      expect(res._getStatusCode()).toBe(500);
      consoleSpy.mockRestore();
    });
  });
}); 
