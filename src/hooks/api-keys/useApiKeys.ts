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
        const key: ApiKey = userId
          ? await apiKeyService.createApiKey(userId, payload)
          : await apiKeyService.createApiKey(payload);
        setApiKeys((prev: ApiKey[]) => [...prev, key]);
        return key;
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
        const key: ApiKey = result.key || result;
        setApiKeys((prev: ApiKey[]) => prev.map((k: ApiKey) => (k.id === id ? key : k)));
        return key;
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
