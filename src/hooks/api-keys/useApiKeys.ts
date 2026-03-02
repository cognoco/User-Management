import { useCallback, useEffect, useState } from 'react';
import { UserManagementConfiguration } from '@/core/config';
import type { ApiKeyService } from '@/core/api-keys/interfaces';
import type { ApiKey } from '@/core/api-keys/types';

export function useApiKeys(userId?: string) {
  // Use any cast to handle version mismatch between hook expectations and service interface
  const apiKeyService =
    UserManagementConfiguration.getServiceProvider<ApiKeyService>('apiKeyService') as any;

  if (!apiKeyService) {
    throw new Error('ApiKeyService is not registered in the service provider registry');
  }

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApiKeys = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const keys: ApiKey[] = userId
        ? await apiKeyService.listApiKeys(userId)
        : await apiKeyService.listApiKeys();
      setApiKeys(keys);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [apiKeyService, userId]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const createApiKey = useCallback(
    async (name: string, permissions: string[], expiresInDays?: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const payload = { name, scopes: permissions, expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : undefined };
        const result = userId
          ? await apiKeyService.createApiKey(userId, payload)
          : await apiKeyService.createApiKey(payload);
        // Service may return ApiKeyCreateResult or ApiKey directly; extract the key entity
        const apiKey: ApiKey = result.key ?? result;
        const plaintext: string | undefined = result.plaintext;
        setApiKeys((prev: ApiKey[]) => [...prev, apiKey]);
        return { key: plaintext ?? '', ...apiKey } as { key: string } & ApiKey;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiKeyService, userId]
  );

  const revokeApiKey = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);
      try {
        userId
          ? await apiKeyService.revokeApiKey(userId, id)
          : await apiKeyService.revokeApiKey(id);
        setApiKeys((prev: ApiKey[]) => prev.filter((k: ApiKey) => k.id !== id));
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiKeyService, userId]
  );

  const regenerateApiKey = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = userId
          ? await apiKeyService.regenerateApiKey(userId, id)
          : await apiKeyService.regenerateApiKey(id);
        const apiKey: ApiKey = result.key ?? result;
        const plaintext: string | undefined = result.plaintext;
        setApiKeys((prev: ApiKey[]) => prev.map((k: ApiKey) => (k.id === id ? apiKey : k)));
        return { key: plaintext ?? '', ...apiKey } as { key: string } & ApiKey;
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiKeyService, userId]
  );

  const validateApiKey = useCallback(
    async (apiKey: string) => {
      try {
        return await apiKeyService.validateApiKey(apiKey, userId);
      } catch (err) {
        return false;
      }
    },
    [apiKeyService, userId]
  );

  return {
    apiKeys,
    isLoading,
    error,
    fetchApiKeys,
    createApiKey,
    revokeApiKey,
    regenerateApiKey,
    validateApiKey
  };
}
