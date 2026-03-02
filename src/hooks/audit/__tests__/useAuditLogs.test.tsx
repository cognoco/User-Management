import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserManagementConfiguration } from '@/core/config';
import type { AuditService } from '@/core/audit/interfaces';
import { useAuditLogs } from '../useAuditLogs';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAuditLogs', () => {
  let service: AuditService;
  beforeEach(() => {
    UserManagementConfiguration.reset();
    service = {
      logEvent: vi.fn(),
      getLogs: vi.fn().mockResolvedValue({ logs: [], count: 0 }),
      exportLogs: vi.fn().mockResolvedValue(new Blob())
    };
    UserManagementConfiguration.configureServiceProviders({ auditService: service });
  });

  afterEach(() => {
    UserManagementConfiguration.reset();
  });

  it('fetches logs from the service', async () => {
    vi.mocked(service.getLogs).mockResolvedValueOnce({ logs: [{ id: '1', action: 'A', status: 'SUCCESS', targetResourceType: 'user', targetResourceId: '1', userId: '1', createdAt: new Date().toISOString() }], count: 1 });

    const { result } = renderHook(() => useAuditLogs(), { wrapper: createWrapper() });

    await waitFor(() => !result.current.isLoading);
    expect(service.getLogs).toHaveBeenCalled();
    expect(result.current.logs.length).toBe(1);
    expect(result.current.total).toBe(1);
  });

  it('exports logs using the service', async () => {
    const { result } = renderHook(() => useAuditLogs(), { wrapper: createWrapper() });
    await waitFor(() => !result.current.isLoading);
    await act(async () => {
      await result.current.exportLogs('pdf');
    });
    expect(service.exportLogs).toHaveBeenCalledWith(expect.objectContaining({ format: 'pdf' }));
  });
});
