import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOptimistic } from '../useOptimistic';

// Setup navigator.onLine mock
beforeEach(() => {
  // Default to online
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    configurable: true,
    value: true
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useOptimistic', () => {
  it('updates optimistically and rolls back on failure', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useOptimistic(0));
    
    // The run function doesn't throw, it handles the error internally
    await act(async () => {
      try {
        await result.current.run(fn, 1);
      } catch {
        // Error is handled internally, no need to catch
      }
    });
    
    expect(result.current.data).toBe(0);
  });

  it('queues actions when offline', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    // Set offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: false
    });
    
    const { result } = renderHook(() => useOptimistic(0));
    await act(async () => {
      await result.current.run(fn, 2);
    });
    expect(result.current.data).toBe(2);
    expect(result.current.queueLength).toBe(1);
  });

  it('flushes queue when online', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    // Start offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: false
    });
    
    const { result } = renderHook(() => useOptimistic(0));
    
    // Queue an action while offline
    await act(async () => {
      await result.current.run(fn, 3);
    });
    expect(result.current.queueLength).toBe(1);
    expect(fn).not.toHaveBeenCalled(); // Function shouldn't be called while offline
    
    // Go back online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true
    });
    
    // Manually flush the queue (simulating the online event handler)
    await act(async () => {
      await result.current.flushQueue();
    });
    
    // After flushing, the queue should be empty and function should have been called
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.current.queueLength).toBe(0);
  });
});
