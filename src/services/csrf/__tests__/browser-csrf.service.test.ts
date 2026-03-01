import { describe, it, expect, vi, afterEach } from 'vitest';
import { BrowserCsrfService } from '../browser-csrf.service';
import type { CsrfDataProvider } from '@/core/csrf/ICsrfDataProvider';

afterEach(() => {
  vi.restoreAllMocks();
});

function mockProvider(overrides: Partial<CsrfDataProvider> = {}): CsrfDataProvider {
  return {
    generateToken: vi.fn(async () => 'abc'),
    createToken: vi.fn(async () => ({ success: true, token: { token: 'abc', createdAt: new Date(), expiresAt: new Date() } })),
    validateToken: vi.fn(async () => ({ valid: true })),
    revokeToken: vi.fn(async () => ({ success: true })),
    getToken: vi.fn(async () => null),
    listTokens: vi.fn(async () => ({ tokens: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } })),
    updateToken: vi.fn(async () => ({ success: true })),
    purgeExpiredTokens: vi.fn(async () => ({ success: true, count: 0 })),
    ...overrides,
  };
}

describe('BrowserCsrfService', () => {
  it('returns token from provider via createToken', async () => {
    const provider = mockProvider();
    const service = new BrowserCsrfService(provider);
    const result = await service.createToken();

    expect(provider.generateToken).toHaveBeenCalled();
    expect(result).toEqual({ success: true, token: { token: 'abc' } });
  });

  it('throws on provider error in createToken', async () => {
    const provider = mockProvider({
      generateToken: vi.fn(async () => {
        throw new Error('fail');
      }),
    });
    const service = new BrowserCsrfService(provider);
    await expect(service.createToken()).rejects.toThrow('fail');
  });

  it('validates a token via provider', async () => {
    const provider = mockProvider({
      validateToken: vi.fn(async () => ({ valid: true })),
    });
    const service = new BrowserCsrfService(provider);
    const result = await service.validateToken('test-token');

    expect(provider.validateToken).toHaveBeenCalledWith('test-token');
    expect(result).toEqual({ valid: true });
  });

  it('returns invalid on validation error', async () => {
    const provider = mockProvider({
      validateToken: vi.fn(async () => {
        throw new Error('bad token');
      }),
    });
    const service = new BrowserCsrfService(provider);
    const result = await service.validateToken('bad');

    expect(result).toEqual({ valid: false, error: 'bad token' });
  });

  it('revokes a token via provider', async () => {
    const provider = mockProvider({
      revokeToken: vi.fn(async () => ({ success: true })),
    });
    const service = new BrowserCsrfService(provider);
    const result = await service.revokeToken('test-token');

    expect(provider.revokeToken).toHaveBeenCalledWith('test-token');
    expect(result).toEqual({ success: true });
  });

  it('returns failure on revoke error', async () => {
    const provider = mockProvider({
      revokeToken: vi.fn(async () => {
        throw new Error('revoke failed');
      }),
    });
    const service = new BrowserCsrfService(provider);
    const result = await service.revokeToken('bad');

    expect(result).toEqual({ success: false, error: 'revoke failed' });
  });
});
