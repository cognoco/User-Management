import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useCsrf } from '../useCsrf';
import { CsrfProvider } from '@/ui/headless/csrf/CsrfProvider';
import type { CsrfService } from '@/core/csrf/interfaces';

function mockCsrfService(overrides: Partial<CsrfService> = {}): CsrfService {
  return {
    createToken: vi.fn(async () => ({ success: true, token: { token: 'tok' } })),
    validateToken: vi.fn(async () => ({ valid: true })),
    revokeToken: vi.fn(async () => ({ success: true })),
    ...overrides,
  };
}

function createWrapper(service: CsrfService) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <CsrfProvider csrfService={service}>{children}</CsrfProvider>
  );
  Wrapper.displayName = 'CsrfTestWrapper';
  return Wrapper;
}

describe('useCsrf', () => {
  it('fetches token on mount', async () => {
    const service = mockCsrfService();
    const { result } = renderHook(() => useCsrf(), { wrapper: createWrapper(service) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(service.createToken).toHaveBeenCalled();
    expect(result.current.token).toBe('tok');
    expect(result.current.error).toBeNull();
  });

  it('handles errors', async () => {
    const service = mockCsrfService({
      createToken: vi.fn(async () => { throw new Error('fail'); }),
    });
    const { result } = renderHook(() => useCsrf(), { wrapper: createWrapper(service) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.token).toBeNull();
    expect(result.current.error).toBe('fail');
  });

  it('validates token', async () => {
    const service = mockCsrfService({
      createToken: vi.fn(async () => ({ success: true, token: { token: 'abc' } })),
    });
    const { result } = renderHook(() => useCsrf(), { wrapper: createWrapper(service) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.validateToken('abc')).toBe(true);
    expect(result.current.validateToken('xyz')).toBe(false);
  });
});
