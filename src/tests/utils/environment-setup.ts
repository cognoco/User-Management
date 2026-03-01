// __tests__/utils/environment-setup.js
import { vi, type Mock } from 'vitest';

/**
 * Sets up the testing environment before running tests
 */
export function setupTestEnvironment() {
  // Store original environment variables
  const originalEnv = { ...process.env };

  // Set up required environment variables for tests
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-url.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.REDIS_TOKEN = 'test-redis-token';

  // Set up browser-like environment for tests
  if (typeof window === 'undefined') {
    global.window = {} as unknown as Window & typeof globalThis;
  }

  if (typeof localStorage === 'undefined') {
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn().mockReturnValue(null),
    } as unknown as Storage;
  }

  if (typeof sessionStorage === 'undefined') {
    global.sessionStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn().mockReturnValue(null),
    } as unknown as Storage;
  }

  if (typeof document === 'undefined') {
    global.document = {
      createElement: vi.fn(),
      getElementById: vi.fn(),
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(),
      documentElement: {
        style: {} as CSSStyleDeclaration
      }
    } as unknown as Document;
  }

  // Set up mock APIs
  if (typeof fetch === 'undefined') {
    global.fetch = vi.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        status: 200,
        statusText: 'OK'
      })
    );
  }

  // Return cleanup function
  return () => {
    // Restore original environment variables
    process.env = originalEnv;

    // Clean up mocks
    const fetchMock = global.fetch as unknown as Mock;
    if (fetchMock && typeof fetchMock.mockReset === 'function') {
      fetchMock.mockReset();
    }
  };
}

/**
 * Creates a mock console for capturing and suppressing console output
 * @returns Mock console with original methods and capture/restore functions
 */
export function createMockConsole() {
  // Store original console methods
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
  };

  // Store captured console output
  const captured: {
    logs: unknown[][];
    warnings: unknown[][];
    errors: unknown[][];
    infos: unknown[][];
    debugs: unknown[][];
  } = {
    logs: [],
    warnings: [],
    errors: [],
    infos: [],
    debugs: []
  };

  // Replace console methods with mocks
  console.log = vi.fn((...args: unknown[]) => {
    captured.logs.push(args);
  });

  console.warn = vi.fn((...args: unknown[]) => {
    captured.warnings.push(args);
  });

  console.error = vi.fn((...args: unknown[]) => {
    captured.errors.push(args);
  });

  console.info = vi.fn((...args: unknown[]) => {
    captured.infos.push(args);
  });

  console.debug = vi.fn((...args: unknown[]) => {
    captured.debugs.push(args);
  });

  // Return helper object
  return {
    // Get captured output
    captured,

    // Reset captured output
    reset: () => {
      captured.logs = [];
      captured.warnings = [];
      captured.errors = [];
      captured.infos = [];
      captured.debugs = [];

      (console.log as unknown as Mock).mockClear();
      (console.warn as unknown as Mock).mockClear();
      (console.error as unknown as Mock).mockClear();
      (console.info as unknown as Mock).mockClear();
      (console.debug as unknown as Mock).mockClear();
    },

    // Restore original console methods
    restore: () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.info = originalConsole.info;
      console.debug = originalConsole.debug;
    }
  };
}

/**
 * Sets up mock timers for testing
 * @param options - Options for mock timers
 * @returns Cleanup function
 */
export function setupMockTimers(options: {
  advanceTimers?: boolean;
  now?: Date;
} = {}) {
  const {
    advanceTimers = false,
    now = new Date('2023-01-01T00:00:00Z')
  } = options;

  // Use fake timers
  vi.useFakeTimers({
    now: now.getTime(),
    toFake: [
      'setTimeout', 'clearTimeout',
      'setInterval', 'clearInterval',
      'Date'
    ]
  });

  // Advance timers if requested
  if (advanceTimers) {
    vi.advanceTimersByTime(0);
  }

  // Return cleanup function
  return () => {
    vi.useRealTimers();
  };
}

/**
 * Mocks the Next.js router
 * @param routerProps - Properties to set on the router
 * @returns Mocked router
 */
export function mockNextRouter(routerProps: Record<string, unknown> = {}) {
  const router = {
    pathname: '/',
    query: {},
    asPath: '/',
    push: vi.fn().mockResolvedValue(true),
    replace: vi.fn().mockResolvedValue(true),
    reload: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn().mockResolvedValue(undefined),
    beforePopState: vi.fn(),
    isFallback: false,
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn()
    },
    ...routerProps
  };

  // Set up the mock
  vi.mock('next/router', () => ({
    useRouter: () => router
  }));

  return router;
}
