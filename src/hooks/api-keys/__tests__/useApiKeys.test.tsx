// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useApiKeys } from '../useApiKeys';
import { UserManagementConfiguration } from '@/core/config';
import type { ApiKeyService } from '@/core/api-keys/interfaces';
import type { ApiKey, ApiKeyCreateResult } from '@/core/api-keys/models';

const mockService: ApiKeyService = {
  listApiKeys: vi.fn(),
  createApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
  regenerateApiKey: vi.fn(),
  validateApiKey: vi.fn()
};

describe('useApiKeys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    UserManagementConfiguration.reset();
    UserManagementConfiguration.configureServiceProviders({ apiKeyService: mockService });
  });

  afterEach(() => {
    UserManagementConfiguration.reset();
  });

  it('fetches api keys on mount', async () => {
    const keys: ApiKey[] = [
      { id: '1', userId: 'u1', name: 'Test', prefix: 'pref', scopes: [], createdAt: new Date().toISOString(), isRevoked: false }
    ];
    vi.mocked(mockService.listApiKeys).mockResolvedValue(keys);

    const { result } = renderHook(() => useApiKeys());

    expect(mockService.listApiKeys).toHaveBeenCalled();
    await act(async () => {
      await result.current.fetchApiKeys();
    });
    expect(result.current.apiKeys).toEqual(keys);
  });

  it('creates api key', async () => {
    const createResult: ApiKeyCreateResult = {
      success: true,
      key: {
        id: '2',
        userId: 'u1',
        name: 'New',
        prefix: 'pref',
        scopes: [],
        createdAt: new Date().toISOString(),
        isRevoked: false
      },
      plaintext: 'secret-plaintext-key'
    };
    vi.mocked(mockService.createApiKey).mockResolvedValue(createResult);
    vi.mocked(mockService.listApiKeys).mockResolvedValue([]);
    const { result } = renderHook(() => useApiKeys());
    await act(async () => {
      await result.current.fetchApiKeys();
    });
    await act(async () => {
      const res = await result.current.createApiKey('New', []);
      expect(res).toEqual(createResult);
    });
    expect(mockService.createApiKey).toHaveBeenCalled();
  });
});
