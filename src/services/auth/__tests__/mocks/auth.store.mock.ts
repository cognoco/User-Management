// src/tests/mocks/auth.store.mock.ts
// Robust mock factory for useAuthStore (Zustand)
// Usage: import { createMockAuthStore } from './auth.store.mock';
//        const mockStore = createMockAuthStore({ user: { ... } }, { login: vi.fn() });
//        vi.mock('@/lib/stores/auth.store', () => ({ useAuth: vi.fn(() => mockStore) }));

import { vi } from 'vitest';
import type { AuthState, AuthResult, MFASetupResponse, MFAVerifyResponse } from '@/types/auth';

const promiseTrue = vi.fn(async () => true);
const promiseAuthResult = vi.fn(async () => ({ success: true } as AuthResult));
const promiseVoid = vi.fn(async () => {});
const promiseMFAVerify = vi.fn(async () => ({ success: true } as MFAVerifyResponse));
const promiseMFASetup = vi.fn(async () => ({ success: true } as MFASetupResponse));
const promiseResetPassword = vi.fn(async () => ({ success: true }));

// Default initial state matching the real store
const defaultState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  successMessage: null,
  rateLimitInfo: null,
  mfaEnabled: false,
  mfaSecret: null,
  mfaQrCode: null,
  mfaBackupCodes: null,
  login: vi.fn(async () => promiseAuthResult()),
  register: vi.fn(async () => promiseAuthResult()),
  logout: promiseVoid,
  resetPassword: vi.fn(async () => promiseResetPassword()),
  updatePassword: promiseVoid,
  sendVerificationEmail: vi.fn(async () => promiseAuthResult()),
  verifyEmail: promiseVoid,
  clearError: vi.fn(),
  clearSuccessMessage: vi.fn(),
  deleteAccount: promiseVoid,
  setUser: vi.fn(),
  setToken: vi.fn(),
  setupMFA: promiseMFASetup,
  verifyMFA: promiseMFAVerify,
  disableMFA: vi.fn(async () => promiseAuthResult()),
  handleSessionTimeout: vi.fn(),
  refreshToken: promiseTrue,
  setLoading: vi.fn(),
};

// Zustand-style hook function with static methods
const useAuthStore: any = vi.fn(() => null);

// Factory to create a robust mock store
export function createMockAuthStore(
  initialState: Partial<AuthState> = {},
  methodOverrides: Partial<Record<keyof AuthState, any>> = {}
) {
  // All methods from the real store, mocked (overridable)
  const store: any = {
    ...defaultState,
    ...initialState,
    getState: () => store,
    setState: (partial: Partial<AuthState>, replace = false) => {
      const newState = replace ? { ...defaultState, ...partial } : { ...store, ...partial };
      for (const key of Object.keys(newState)) {
        store[key] = newState[key];
      }
    },
    // --- Stateful mock implementations for test flows ---
    login: vi.fn(async (payload) => {
      store.isLoading = true;
      // Call the API mock as the real store would
      let apiResult;
      try {
        apiResult = await (globalThis as any).api?.post?.('/api/auth/login', payload);
      } catch (err) {
        store.isLoading = false;
        const errorMsg = (err && typeof err === 'object' && 'response' in err && (err as any).response?.data?.error) ? (err as any).response.data.error : 'Invalid credentials';
        store.error = errorMsg;
        store.isAuthenticated = false;
        store.user = null;
        return { success: false, error: errorMsg };
      }
      if (apiResult && apiResult.data && apiResult.data.user && apiResult.data.token) {
        store.user = apiResult.data.user;
        store.token = apiResult.data.token;
        store.isAuthenticated = true;
        store.isLoading = false;
        store.error = null;
        store.successMessage = null;
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('auth_token', apiResult.data.token);
        }
        // Return the same shape as the real store
        return {
          success: true,
          requiresMfa: apiResult.data.requiresMfa,
          token: apiResult.data.token
        };
      } else {
        store.isLoading = false;
        store.error = 'Invalid credentials';
        store.isAuthenticated = false;
        store.user = null;
        return { success: false, error: 'Invalid credentials' };
      }
    }),
    register: vi.fn(async (payload) => {
      store.isLoading = true;
      store.error = null;
      store.successMessage = null;
      // Call the Supabase signUp mock as the real store would
      let signUpResult;
      try {
        signUpResult = await (globalThis as any).supabase?.auth?.signUp?.(payload);
      } catch (err) {
        store.isLoading = false;
        store.error = (err && typeof err === 'object' && 'message' in err) ? (err as any).message : 'Registration failed';
        store.isAuthenticated = false;
        store.user = null;
        return { success: false, error: store.error };
      }
      if (signUpResult && !signUpResult.error) {
        store.isLoading = false;
        store.user = null; // Not set until email is verified
        store.isAuthenticated = false;
        store.successMessage = 'Registration successful! Please check your email.';
        return { success: true };
      } else {
        store.isLoading = false;
        store.error = signUpResult?.error?.message || 'Registration failed';
        store.isAuthenticated = false;
        store.user = null;
        return { success: false, error: store.error };
      }
    }),
    logout: vi.fn(async () => {
      // Call the API mock as the real store would
      try {
        await (globalThis as any).api?.post?.('/api/auth/logout');
      } catch (err) {
        store.isLoading = false;
        const errorMsg = (err && typeof err === 'object' && 'response' in err && (err as any).response?.data?.error) ? (err as any).response.data.error : 'Logout failed';
        store.error = errorMsg;
        return { error: errorMsg };
      }
      store.isLoading = false;
      store.user = null;
      store.token = null;
      store.isAuthenticated = false;
      store.error = null;
      store.successMessage = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('auth_token');
      }
      return {};
    }),
    clearError: vi.fn(() => {
      store.error = null;
    }),
    clearSuccessMessage: vi.fn(() => {
      store.successMessage = null;
    }),
    deleteAccount: vi.fn(async (password) => {
      // Call the API mock as the real store would
      try {
        await (globalThis as any).api?.delete?.('/api/auth/delete-account', { data: { password } });
      } catch (err) {
        store.error = (err && typeof err === 'object' && 'response' in err && (err as any).response?.data?.error) ? (err as any).response.data.error : 'Delete failed';
        return { error: store.error };
      }
      if (store.user && store.user.email === 'test@example.com') {
        store.user = null;
        store.isAuthenticated = false;
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem('auth_token');
        }
        return {};
      } else {
        store.error = 'Delete failed';
        return { error: 'Delete failed' };
      }
    }),
    // --- End stateful mock implementations ---
    // Allow overrides for other methods
    ...methodOverrides,
  };

  // Allow direct state mutation for tests
  store.__setState = (partial: Partial<AuthState>, replace = false) => store.setState(partial, replace);

  // Attach Zustand-like static methods
  useAuthStore.getState = store.getState;
  useAuthStore.setState = store.setState;
  useAuthStore.subscribe = vi.fn(); // no-op
  useAuthStore.destroy = vi.fn(); // no-op

  // Make the hook return the store when called
  useAuthStore.mockReturnValue(store);

  return useAuthStore;
} 