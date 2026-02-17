import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOptimistic } from '../useOptimistic';

// The global test setup stubs navigator without onLine. We define it here
// so each test can control the online/offline state.
beforeEach(() => {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    get: () => true,
  });
});

describe('useOptimistic', () => {
  it('updates optimistically and rolls back on failure', async () => {
    // navigator.onLine = true (from beforeEach)
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useOptimistic(0));
    await act(async () => {
      await result.current.run(fn, 1);
    });
    expect(result.current.data).toBe(0);
  });

  it('queues actions when offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    const fn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOptimistic(0));
    await act(async () => {
      await result.current.run(fn, 2);
    });
    expect(result.current.data).toBe(2);
    expect(result.current.queueLength).toBe(1);
  });

  it('flushes queue when online', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    const fn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOptimistic(0));
    await act(async () => {
      await result.current.run(fn, 3);
    });
    expect(result.current.queueLength).toBe(1);

    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
    await act(async () => {
      await result.current.flushQueue();
    });
    // Verify the queued action was executed (proving the flush ran)
    expect(fn).toHaveBeenCalledWith(3);
  });
});
