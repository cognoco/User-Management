// __tests__/utils/api-testing-utils.js

import { createMocks, RequestMethod } from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';

interface ApiMockOptions {
  method?: RequestMethod;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  authUser?: { id: string; [key: string]: unknown } | null;
  url?: string;
}

type NextApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void;
type Middleware = (req: NextApiRequest, res: NextApiResponse, next: () => Promise<void>) => Promise<void> | void;

/**
 * Creates mock req/res objects with common defaults for API route testing
 */
export function createApiMocks(options: ApiMockOptions = {}) {
  const { 
    method = 'GET', 
    body = {}, 
    query = {}, 
    headers = {},
    cookies = {},
    authUser = null,
    url = '/api/test'
  } = options;
  
  // Add authorization header if user is provided
  const finalHeaders: Record<string, string> = { ...headers };
  if (authUser) {
    finalHeaders.authorization = `Bearer mock-token-for-${authUser.id}`;
  }
  
  const { req, res } = createMocks({
    method,
    body,
    query,
    headers: finalHeaders,
    cookies,
    url
  });
  
  // Add user to request if provided
  if (authUser) {
    (req as NextApiRequest & { user: unknown }).user = authUser;
  }
  
  // Add helper methods for testing responses
  (res as unknown as { getJsonData: () => unknown }).getJsonData = () => JSON.parse(res._getData());
  
  return { req, res };
}

/**
 * Creates a test handler for API routes
 */
export function createTestHandler(handler: NextApiHandler, middleware: Middleware | null = null) {
  return async (options: ApiMockOptions = {}) => {
    const { req, res } = createApiMocks(options);
    
    if (middleware) {
      // Create a simple next function for middleware
      const next = vi.fn().mockImplementation(async () => {
        await handler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);
      });
      
      await middleware(req as unknown as NextApiRequest, res as unknown as NextApiResponse, next);
      
      // If next wasn't called, the middleware handled the response
      if (next.mock.calls.length === 0) {
        return { req, res };
      }
    } else {
      await handler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);
    }
    
    return { req, res };
  };
}

/**
 * Simulates a GET request to an API route
 */
export async function testGet(handler: NextApiHandler, options: ApiMockOptions = {}) {
  const testHandler = createTestHandler(handler);
  const { res } = await testHandler({ ...options, method: 'GET' });
  return {
    status: res._getStatusCode(),
    data: (res as unknown as { getJsonData: () => unknown }).getJsonData()
  };
}

/**
 * Simulates a POST request to an API route
 */
export async function testPost(handler: NextApiHandler, body: Record<string, unknown> = {}, options: ApiMockOptions = {}) {
  const testHandler = createTestHandler(handler);
  const { res } = await testHandler({ ...options, method: 'POST', body });
  return {
    status: res._getStatusCode(),
    data: (res as unknown as { getJsonData: () => unknown }).getJsonData()
  };
}

/**
 * Simulates a PUT request to an API route
 */
export async function testPut(handler: NextApiHandler, body: Record<string, unknown> = {}, options: ApiMockOptions = {}) {
  const testHandler = createTestHandler(handler);
  const { res } = await testHandler({ ...options, method: 'PUT', body });
  return {
    status: res._getStatusCode(),
    data: (res as unknown as { getJsonData: () => unknown }).getJsonData()
  };
}

/**
 * Simulates a DELETE request to an API route
 */
export async function testDelete(handler: NextApiHandler, options: ApiMockOptions = {}) {
  const testHandler = createTestHandler(handler);
  const { res } = await testHandler({ ...options, method: 'DELETE' });
  return {
    status: res._getStatusCode(),
    data: (res as unknown as { getJsonData: () => unknown }).getJsonData()
  };
}

/**
 * Simulates an authenticated request to an API route
 */
export async function testAuthenticated(handler: NextApiHandler, user: { id: string; [key: string]: unknown }, options: ApiMockOptions = {}) {
  const testHandler = createTestHandler(handler);
  const { res } = await testHandler({ ...options, authUser: user });
  return {
    status: res._getStatusCode(),
    data: (res as unknown as { getJsonData: () => unknown }).getJsonData()
  };
}
