import { NextApiRequest, NextApiResponse } from 'next';
import { csrf, getCSRFToken, type CSRFTokenProvider } from '../csrf';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock crypto module properly using importOriginal
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  return {
    ...actual,
    randomBytes: () => ({
      toString: () => 'mock-token'
    })
  };
});

// Mock NextApiRequest and NextApiResponse
const mockReq = (method = 'GET', cookies = {}, headers = {}) => ({
  method,
  cookies,
  headers: { ...headers },
}) as unknown as NextApiRequest;

const mockRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
    getHeader: vi.fn(),
    headers: new Map(),
  } as unknown as NextApiResponse;
  return res;
};

describe('CSRF Middleware', () => {
  let next: () => Promise<void>;

  beforeEach(() => {
    next = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Token Generation', () => {
    it('should generate a new token for GET requests without existing token', async () => {
      const req = mockReq('GET');
      const res = mockRes();
      const middleware = csrf();

      await middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.arrayContaining([
        expect.stringContaining('csrf-token=')
      ]));
      expect(next).toHaveBeenCalled();
    });

    it('should not generate a new token for GET requests with existing token', async () => {
      const req = mockReq('GET', { 'csrf-token': 'existing-token' });
      const res = mockRes();
      const middleware = csrf();

      await middleware(req, res, next);

      expect(res.setHeader).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Token Validation', () => {
    it('should validate matching tokens for POST requests', async () => {
      const token = 'valid-token';
      const req = mockReq('POST', 
        { 'csrf-token': token }, 
        { 'x-csrf-token': token }
      );
      const res = mockRes();
      const middleware = csrf();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(403);
    });

    it('should reject requests with missing tokens', async () => {
      const req = mockReq('POST');
      const res = mockRes();
      const middleware = csrf();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: { code: 'AUTH_ACCESS_002', message: 'Invalid CSRF token' }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject requests with mismatched tokens', async () => {
      const req = mockReq('POST',
        { 'csrf-token': 'token1' },
        { 'x-csrf-token': 'token2' }
      );
      const res = mockRes();
      const middleware = csrf();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: { code: 'AUTH_ACCESS_002', message: 'Invalid CSRF token' }
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Options', () => {
    it('should use custom cookie name when provided', async () => {
      const req = mockReq('GET');
      const res = mockRes();
      const middleware = csrf({ cookieName: 'custom-csrf' });

      await middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.arrayContaining([
        expect.stringContaining('custom-csrf=')
      ]));
    });

    it('should use custom header name when provided', async () => {
      const token = 'valid-token';
      const req = mockReq('POST',
        { 'csrf-token': token },
        { 'custom-csrf-header': token }
      );
      const res = mockRes();
      const middleware = csrf({ headerName: 'custom-csrf-header' });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should set secure flag in production', async () => {
      // Mock the production environment instead of trying to reassign NODE_ENV
      const originalNodeEnv = process.env.NODE_ENV;
      vi.stubEnv('NODE_ENV', 'production');

      const req = mockReq('GET');
      const res = mockRes();
      const middleware = csrf();

      await middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.arrayContaining([
        expect.stringContaining('Secure')
      ]));

      // Restore the environment
      vi.stubEnv('NODE_ENV', originalNodeEnv || 'test');
    });

    it('should apply custom cookie options', async () => {
      const req = mockReq('GET');
      const res = mockRes();
      const middleware = csrf({ cookieOptions: { httpOnly: false, sameSite: 'none' } });

      await middleware(req, res, next);

      const cookie = (res.setHeader as any).mock.calls[0][1][0] as string;
      expect(cookie).not.toContain('HttpOnly');
      expect(cookie).toContain('SameSite=none');
    });

    it('should use a custom token provider', async () => {
      const tokenProvider: CSRFTokenProvider = {
        generateToken: vi.fn(() => 'prov-token'),
        getToken: vi.fn(() => null),
        saveToken: vi.fn(),
      };
      const req = mockReq('GET');
      const res = mockRes();
      const middleware = csrf({ tokenProvider });

      await middleware(req, res, next);

      expect(tokenProvider.generateToken).toHaveBeenCalled();
      expect(tokenProvider.saveToken).toHaveBeenCalledWith(res, 'prov-token', expect.any(Object));
    });

    it('should call custom error handler on validation failure', async () => {
      const errorHandler = vi.fn();
      const req = mockReq('POST');
      const res = mockRes();
      const middleware = csrf({ onError: errorHandler });

      await middleware(req, res, next);

      expect(errorHandler).toHaveBeenCalledWith(req, res);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getCSRFToken', () => {
    it('should return token from cookies', () => {
      const token = 'test-token';
      const req = mockReq('GET', { 'csrf-token': token });

      const result = getCSRFToken(req);

      expect(result).toBe(token);
    });

    it('should return null when no token exists', () => {
      const req = mockReq('GET');

      const result = getCSRFToken(req);

      expect(result).toBeNull();
    });
  });
}); 