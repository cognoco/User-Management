import { describe, it, expect, vi } from 'vitest';
import { DefaultCsrfService } from '../default-csrf.service';
import type { CsrfDataProvider } from '@/core/csrf/ICsrfDataProvider';

describe('DefaultCsrfService', () => {
  it('returns token from provider', async () => {
    const mockProvider: CsrfDataProvider = {
      createToken: vi.fn(async () => ({ success: true, token: { token: 'token123' } })),
      validateToken: vi.fn(async () => ({ valid: true })),
      revokeToken: vi.fn(async () => ({ success: true })),
      generateToken: vi.fn(async () => 'generated-token'),
      getToken: vi.fn(async () => null),
      listTokens: vi.fn(async () => ({ tokens: [], pagination: { totalItems: 0, page: 1, pageSize: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false } })),
      updateToken: vi.fn(async () => ({ success: true })),
      purgeExpiredTokens: vi.fn(async () => ({ success: true, count: 0 })),
    };
    const service = new DefaultCsrfService(mockProvider);
    const result = await service.createToken();
    expect(result).toEqual({ success: true, token: { token: 'token123' } });
  });
});
