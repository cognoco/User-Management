import 'vitest';

// Provide backward-compatibility for older test code that still refers to `vi.Mock`.
// Vitest v3 renamed its main mock instance type. This ambient declaration maps
// the old `vi.Mock` reference to the current `MockInstance` type so legacy tests
// continue to compile without changes.

declare global {
  namespace vi {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type Mock<TReturn = any, TArgs extends any[] = any[]> = import('vitest').MockInstance<TReturn, TArgs>;
  }
}

export {}; 