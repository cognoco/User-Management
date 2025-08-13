import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useErrorHandling } from '../useErrorHandling';

// Mock the error constants to avoid import issues
vi.mock('@/core/common/errors', async () => {
  const actual = await vi.importActual<any>('@/core/common/errors');
  return {
    ...actual,
    SERVER_ERROR: {
      SERVER_001: 'SERVER_001',
    },
    ApplicationError: actual.ApplicationError || class ApplicationError extends Error {
      constructor(
        public code: string,
        message: string,
        public httpStatus = 500,
        public details?: Record<string, any>
      ) {
        super(message);
        this.name = 'ApplicationError';
      }
    },
  };
});

describe('useErrorHandling', () => {
  it('handles errors and clears them', () => {
    const { result } = renderHook(() => useErrorHandling());
    act(() => {
      result.current.handleError(new Error('oops'));
    });
    expect(result.current.error?.message).toBe('oops');
    act(() => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();
  });

  it('retries with exponential backoff', async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue(undefined);
    const { result } = renderHook(() => useErrorHandling({ retryFn: fn }));
    
    await act(async () => {
      // Start the retry
      const retryPromise = result.current.retry();
      
      // Advance timers to trigger the retry
      await vi.runAllTimersAsync();
      
      // Wait for the retry to complete
      await retryPromise;
    });
    
    expect(fn).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(0);
    vi.useRealTimers();
  }, 10000); // Add timeout
});
