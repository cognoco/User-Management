import type { Mock } from 'vitest';

// Type helper for Jest/Vitest mock functions
export type JestMockFunction<TReturn, TArgs extends any[]> = Mock<(...args: TArgs) => TReturn>;

// Type helper for mocked promises
export type MockedPromise<T> = Promise<T> & {
  mockResolvedValue: (value: T) => void;
  mockRejectedValue: (error: Error) => void;
};
