import { useCallback, useState } from 'react';
import { ApplicationError, createError } from '@/core/common/errors';
import { SERVER_ERROR } from '@/core/common/error-codes';

export interface RetryStrategy {
  (attempt: number): number;
}

export interface UseErrorHandlingOptions {
  retryFn?: () => Promise<void>;
  maxRetries?: number;
  retryStrategy?: RetryStrategy;
}

interface State {
  isLoading: boolean;
  error: ApplicationError | null;
  retryCount: number;
}

const defaultStrategy: RetryStrategy = (attempt) => 2 ** attempt * 100;

export function useErrorHandling(options: UseErrorHandlingOptions = {}) {
  const { retryFn, maxRetries = 3, retryStrategy = defaultStrategy } = options;

  const [state, setState] = useState<State>({ isLoading: false, error: null, retryCount: 0 });

  const handleError = useCallback((err: unknown) => {
    let appError: ApplicationError;
    if (err instanceof ApplicationError) {
      appError = err;
    } else if (err instanceof Error) {
      appError = new ApplicationError(SERVER_ERROR.SERVER_001, err.message);
    } else {
      appError = new ApplicationError(SERVER_ERROR.SERVER_001, 'Unknown error');
    }
    setState((s) => ({ ...s, error: appError, isLoading: false }));
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null, retryCount: 0 }));
  }, []);

  const retry = useCallback(async () => {
    if (!retryFn) return;
    let attempt = 0;
    setState((s) => ({ ...s, isLoading: true }));
    while (attempt < maxRetries) {
      try {
        await retryFn();
        setState({ isLoading: false, error: null, retryCount: 0 });
        return;
      } catch (err) {
        attempt += 1;
        if (attempt >= maxRetries) {
          handleError(err);
          setState((s) => ({ ...s, isLoading: false, retryCount: attempt }));
          return;
        }
        setState((s) => ({ ...s, retryCount: attempt }));
        const delay = retryStrategy(attempt);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }, [retryFn, maxRetries, retryStrategy, handleError]);

  return {
    handleError,
    isLoading: state.isLoading,
    error: state.error,
    clearError,
    retry,
    retryCount: state.retryCount,
  };
}

export function useApiErrorHandling(apiCall: () => Promise<void>, options?: Omit<UseErrorHandlingOptions, 'retryFn'>) {
  return useErrorHandling({ ...options, retryFn: apiCall });
}

export function useFormErrorHandling(submit: () => Promise<void>, options?: Omit<UseErrorHandlingOptions, 'retryFn'>) {
  return useErrorHandling({ ...options, retryFn: submit });
}

export function useAuthErrorHandling(authCall: () => Promise<void>, options?: Omit<UseErrorHandlingOptions, 'retryFn'>) {
  return useErrorHandling({ ...options, retryFn: authCall });
}

export default useErrorHandling;
