import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserManagementConfiguration } from '@/core/config';
import { useWebhooks } from '../useWebhooks';
import type { IWebhookService } from '@/core/webhooks';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const mockService: IWebhookService = {
  createWebhook: vi.fn(async () => ({ success: true, webhook: { id: '1', userId: 'u1', name: 'n', url: 'url', events: [], secret: '', isActive: true, createdAt: '' } })),
  getWebhooks: vi.fn(async () => []),
  getWebhook: vi.fn(),
  updateWebhook: vi.fn(async () => ({ success: true, webhook: { id: '1', userId: 'u1', name: 'n', url: 'u', events: [], secret: '', isActive: true, createdAt: '' } })),
  deleteWebhook: vi.fn(async () => ({ success: true })),
  getWebhookDeliveries: vi.fn(),
  triggerEvent: vi.fn(async () => [])
};

beforeEach(() => {
  UserManagementConfiguration.reset();
  UserManagementConfiguration.configureServiceProviders({ webhookService: mockService });
  vi.clearAllMocks();
});

describe('useWebhooks', () => {
  it('fetches webhooks', async () => {
    (mockService.getWebhooks as any).mockResolvedValueOnce([
      { id: '1', userId: 'u1', name: 'n', url: 'u', events: [], secret: '', isActive: true, createdAt: '' }
    ]);
    const { result } = renderHook(() => useWebhooks('u1'), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.fetchWebhooks();
    });
    expect(mockService.getWebhooks).toHaveBeenCalledWith('u1');
    await waitFor(() => expect(result.current.webhooks.length).toBe(1));
  });

  it('creates webhook', async () => {
    (mockService.getWebhooks as any).mockResolvedValueOnce([]); // initial load
    (mockService.getWebhooks as any).mockResolvedValueOnce([
      { id: '1', userId: 'u1', name: 'n', url: 'u', events: [], secret: '', isActive: true, createdAt: '' }
    ]);
    const { result } = renderHook(() => useWebhooks('u1'), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.createWebhook.mutateAsync({ name: 'n', url: 'u', events: ['user.created'], isActive: true });
    });
    expect(mockService.createWebhook).toHaveBeenCalled();
    await waitFor(() => expect(result.current.webhooks.length).toBe(1));
  });
});
