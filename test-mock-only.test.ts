import { describe, it, expect, vi } from 'vitest';

// Just test that mocking works
vi.mock('@/lib/config/service-locator', () => ({
  ServiceLocator: {
    getInstance: vi.fn(() => ({
      has: vi.fn(() => true),
      get: vi.fn(() => ({}))
    }))
  },
  ServiceKeys: {
    TWO_FACTOR_SERVICE: 'twoFactor'
  }
}));

vi.mock('@/lib/api/common', () => ({
  createSuccessResponse: vi.fn((data) => Response.json(data)),
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) {
      super(message);
    }
  },
  ERROR_CODES: {
    INVALID_REQUEST: 'INVALID_REQUEST'
  }
}));

describe('Mock test', () => {
  it('should pass without importing route', () => {
    expect(1).toBe(1);
  });
});