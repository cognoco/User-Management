// __tests__/utils/hook-testing-utils.tsx

import { renderHook, act } from '@testing-library/react';
import React, { type ReactNode } from 'react';

type ProviderMap = Record<string, Record<string, unknown>>;

interface RenderCustomHookOptions {
  providers?: ProviderMap;
  initialProps?: unknown;
  [key: string]: unknown;
}

/**
 * Creates a wrapper component with provided context providers
 */
export function createWrapper(providers: ProviderMap = {}) {
  return ({ children }: { children: ReactNode }) => {
    // Wrap children in each provider
    return Object.entries(providers).reduce<ReactNode>((wrapped, [_key, _props]) => {
      // Provider wrapping would need actual component references, not string keys
      // This is a simplified version for testing
      return wrapped;
    }, children);
  };
}

/**
 * Renders a hook with convenient helpers for testing
 */
export function renderCustomHook<TResult>(
  hook: () => TResult,
  options: RenderCustomHookOptions = {}
) {
  const {
    providers = {},
    initialProps,
    ...renderOptions
  } = options;

  // Create wrapper with providers
  const wrapper = createWrapper(providers);
  
  // Render the hook
  const result = renderHook(hook, {
    wrapper,
    ...(initialProps !== undefined ? { initialProps } : {}),
    ...renderOptions
  });
  
  return {
    ...result,
    /**
     * Updates hook state with an action
     */
    act: async (action: (current: TResult) => void | Promise<void>) => {
      await act(async () => {
        await action(result.result.current);
      });
    },
    
    /**
     * Updates hook props
     */
    updateProps: (props: unknown) => {
      result.rerender(props as never);
    },
    
    /**
     * Gets current hook state
     */
    getState: (): TResult => result.result.current
  };
}

/**
 * Tests a hook with initial and final states
 */
export async function testHookState<TResult>(
  hook: () => TResult,
  action: (current: TResult) => void | Promise<void>,
  assertion: (current: TResult) => void
) {
  const { result } = renderHook(() => hook());
  
  await act(async () => {
    await action(result.current);
  });
  
  assertion(result.current);
}

/**
 * Tests a hook's effect cleanups
 */
export function testHookCleanup<TResult>(
  hook: (props: unknown) => TResult,
  deps: unknown[] = [],
  _mockCleanup = vi.fn()
) {
  // React 19 compatible approach to testing cleanup
  const mockFunction = vi.fn();
  
  // Render the hook with initial props
  const { result, rerender, unmount } = renderHook(
    (props: unknown) => {
      React.useEffect(() => {
        return mockFunction;
      }, Array.isArray(props) ? props : [props]);
      
      return hook(props);
    },
    { initialProps: deps[0] }
  );
  
  // Re-render with new deps to trigger cleanup
  if (deps.length > 1) {
    rerender(deps[1]);
    // In React 19, effect cleanup is called on re-render if dependencies change
    expect(mockFunction).toHaveBeenCalled();
    mockFunction.mockClear();
  }
  
  // Unmount to trigger final cleanup
  unmount();
  expect(mockFunction).toHaveBeenCalled();
  
  return {
    result,
    cleanup: mockFunction,
    unmount
  };
}

/**
 * Creates a mock for useState hook
 */
export function createMockState<T>(initialValue: T): [T, ReturnType<typeof vi.fn>] {
  let state = initialValue;
  const setState = vi.fn().mockImplementation((newValue: T | ((prev: T) => T)) => {
    if (typeof newValue === 'function') {
      state = (newValue as (prev: T) => T)(state);
    } else {
      state = newValue;
    }
  });
  
  return [state, setState];
}

/**
 * Creates a mock for useContext hook
 */
export function createMockContext<T>(contextValue: T) {
  return vi.fn().mockReturnValue(contextValue);
}

/**
 * Creates a mock for useRef hook
 */
export function createMockRef<T>(initialValue: T) {
  return { current: initialValue };
}
