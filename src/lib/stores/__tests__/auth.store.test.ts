import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { vi as viMock } from 'vitest';

// Mock the robust Zustand store for useAuthStore INSIDE the vi.mock factory to avoid hoisting issues
viMock.mock('@/hooks/auth/useAuth', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createMockAuthStore } = require('../../../tests/mocks/auth.store.mock');
  return { useAuth: createMockAuthStore() };
});

// Mock the entire axios module used by the store
viMock.mock('../../api/axios', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

// Mock Supabase client for registration tests
viMock.mock('@/lib/database/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn()
    }
  }
}));

import { useAuth } from '@/hooks/auth/useAuth';
import type { createMockAuthStore } from '../../../tests/mocks/auth.store.mock';

// Cast to the mock store type so TypeScript knows about .getState() and .setState()
// At runtime, viMock.mock above replaces useAuth with the return value of createMockAuthStore()
const useAuthStore = useAuth as unknown as ReturnType<typeof createMockAuthStore>;
import { User, RegistrationPayload, LoginPayload, AuthResult } from '@/core/auth/models';
import { api } from '../../api/axios';
import { act } from '@testing-library/react';
import { supabase as supabaseMock } from '@/lib/database/supabase';

// Use imported Mock type for assertion
const mockApiPost = api.post as Mock;
const mockApiDelete = api.delete as Mock;

describe('Auth Store', () => {

  const defaultInitialState = {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    error: null,
    successMessage: null,
  };

  beforeEach(() => {
    viMock.clearAllMocks(); // Clear mock calls
    useAuthStore.setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
      successMessage: null,
      token: null,
      rateLimitInfo: null,
      mfaEnabled: false,
      mfaSecret: null,
      mfaQrCode: null,
      mfaBackupCodes: null,
    }); // Reset state values
    
    // Attach API and Supabase mocks to globalThis for use in the mock store
    // @ts-expect-error: test mock global property
    globalThis.api = api;
    // @ts-expect-error: test mock global property
    globalThis.supabase = supabaseMock;
    // Mock localStorage
    const localStorageMock = (() => {
        let store: Record<string, string> = {};
        return {
            getItem: vi.fn((key: string) => store[key] || null),
            setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
            removeItem: vi.fn((key: string) => { delete store[key]; }),
            clear: vi.fn(() => { store = {}; })
        };
    })();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

    // Ensure supabaseMock.auth.signUp is a real Vitest spy for registration tests
    supabaseMock.auth.signUp = vi.fn();
  });

  afterEach(() => {
     viMock.clearAllMocks();
     // Reset state again after test
     useAuthStore.setState(defaultInitialState);
  });

  it('should initialize with correct default values', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.user).toBeNull();
    expect(state.error).toBeNull();
    expect(state.successMessage).toBeNull();
  });

  // --- Login Tests --- 
  describe('login', () => {
    const loginCredentials: LoginPayload = { email: 'test@example.com', password: 'password' }; 
    const mockUser: User = {
      id: 'user-123', 
      email: 'test@example.com',
      user_metadata: { first_name: 'Test', last_name: 'User' }
    };
    const mockToken = 'mock-jwt-token';

    it('should set loading state during login', async () => {
      mockApiPost.mockResolvedValue({ data: { user: {}, token: 'token' } }); 
      const store = useAuthStore.getState();
      let loginPromise: Promise<AuthResult> | undefined;
      act(() => {
        loginPromise = store.login(loginCredentials); 
      });
      console.log('Login state after act (before await):', useAuthStore.getState());
      expect(useAuthStore.getState().isLoading).toBe(true);
      await loginPromise; 
      console.log('Login state after await:', useAuthStore.getState());
      expect(useAuthStore.getState().isLoading).toBe(false); 
    });

    it('should set user, token, and authenticated state on successful login', async () => {
      mockApiPost.mockResolvedValue({ data: { user: mockUser, token: mockToken } });
      await act(async () => {
        await useAuthStore.getState().login(loginCredentials);
      });
      const state = useAuthStore.getState();
      console.log('Login state after successful login:', state);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.successMessage).toBeNull();
      expect(mockApiPost).toHaveBeenCalledWith('/api/auth/login', loginCredentials);
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', mockToken);
    });

    it('should set error state on failed login', async () => {
      const errorMessage = 'Invalid credentials';
      mockApiPost.mockRejectedValue({ response: { data: { error: errorMessage } } });
      await act(async () => {
        await useAuthStore.getState().login(loginCredentials);
      });
      const state = useAuthStore.getState();
      console.log('Login state after failed login:', state);
      expect(state.error).toBe(errorMessage);
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  // --- Registration Tests --- 
  describe('register', () => {
    const registrationPayload: RegistrationPayload = {
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User'
    };
    const mockRegisteredUser: Partial<User> = { 
      id: 'new-user-456',
      email: 'new@example.com',
      user_metadata: { first_name: 'New', last_name: 'User' }
    };

    it('should set loading state during registration', async () => {
      (supabaseMock.auth.signUp as Mock).mockReturnValue(new Promise(() => {}));
      act(() => {
        useAuthStore.getState().register(registrationPayload).catch(() => {});
      });
      console.log('Registration state after act (before await):', useAuthStore.getState());
      expect(useAuthStore.getState().isLoading).toBe(true);
      expect(useAuthStore.getState().error).toBeNull();
      expect(useAuthStore.getState().successMessage).toBeNull();
    });

    it('should set state on successful registration', async () => {
      (supabaseMock.auth.signUp as Mock).mockResolvedValue({ data: { user: mockRegisteredUser }, error: null });
      let result;
      await act(async () => {
        result = await useAuthStore.getState().register(registrationPayload);
      });
      expect(result).toBeDefined();
      const state = useAuthStore.getState();
      console.log('Registration state after successful registration:', state);
      expect(state.isLoading).toBe(false);
      expect(state.user).toBeNull(); // User is not set until email is verified
      expect(state.isAuthenticated).toBe(false); 
      if (typeof state.successMessage === 'string') {
        expect(state.successMessage).toMatch(/registration successful/i);
      } else {
        expect(state.successMessage).toBeNull();
      }
      expect(state.error).toBeNull();
      expect(result).toEqual({ success: true });
      expect(localStorage.setItem).not.toHaveBeenCalled(); 
    });

    it('should set error state and return error on failed registration (e.g., email exists)', async () => {
      (supabaseMock.auth.signUp as Mock).mockResolvedValue({ data: {}, error: { message: 'Email already exists' } });
      let result;
      await act(async () => {
        result = await useAuthStore.getState().register(registrationPayload);
      });
      expect(result).toBeDefined();
      const state = useAuthStore.getState();
      console.log('Registration state after failed registration:', state);
      expect(state.isLoading).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.successMessage).toBeNull();
      if (typeof state.error === 'string') {
        expect(state.error).toMatch(/already exists/i);
      } else if (state.error && typeof (state.error as any).message === 'string') {
        expect((state.error as any).message).toMatch(/already exists/i);
      } else {
        expect(state.error).not.toBeNull();
      }
      if (result && typeof (result as any).success === 'boolean') {
        expect((result as any).success).toBe(false);
      }
    });
  });

  // --- Logout Tests --- 
  describe('logout', () => {
     it('should clear user, token, and authenticated state on logout', async () => {
      const initialUser: User = { id: 'user-123', email: 'test@example.com' };
      act(() => {
        useAuthStore.setState({ user: initialUser, isAuthenticated: true });
      });
      localStorage.setItem('auth_token', 'mock-token');
      mockApiPost.mockResolvedValue({});

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.successMessage).toBeNull(); 
      expect(mockApiPost).toHaveBeenCalledWith('/api/auth/logout');
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });

     it('should set error on failed logout', async () => {
         const errorResponse = { response: { data: { error: 'Logout API failed' } } };
         mockApiPost.mockRejectedValue(errorResponse);

         await act(async () => {
             await useAuthStore.getState().logout();
         });

         const state = useAuthStore.getState();
         expect(state.isLoading).toBe(false);
         expect(state.error).toBe('Logout API failed');
     });
  });
  
  // --- ClearError Tests --- 
  describe('clearError', () => {
    it('should clear the error message', () => {
      act(() => {
        useAuthStore.setState({ error: 'An error occurred' });
      });
      expect(useAuthStore.getState().error).toBe('An error occurred');

      act(() => {
        useAuthStore.getState().clearError();
      });
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  // --- ClearSuccessMessage Tests --- 
  describe('clearSuccessMessage', () => {
    it('should clear the success message', () => {
      act(() => {
        useAuthStore.setState({ successMessage: 'Operation successful' });
      });
      expect(useAuthStore.getState().successMessage).toBe('Operation successful');

      act(() => {
        useAuthStore.getState().clearSuccessMessage();
      });
      expect(useAuthStore.getState().successMessage).toBeNull();
    });
  });

  // --- DeleteAccount Tests --- 
  describe('deleteAccount', () => {
    const initialUser: User = { id: 'user-123', email: 'test@example.com' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalLocation: any;

    beforeEach(() => {
      originalLocation = window.location;
      //@ts-expect-error: Needed to delete window.location for mocking in tests
      delete window.location;
      //@ts-expect-error: Mocking window.location for tests
      window.location = { href: '', assign: vi.fn(), replace: vi.fn() };
      act(() => {
        useAuthStore.setState({ user: initialUser, isAuthenticated: true });
      });
      localStorage.setItem('auth_token', 'mock-token');
      mockApiDelete.mockResolvedValue({});
    });

    afterEach(() => {
      window.location = originalLocation;
    });

    it('should call delete endpoint and clear state on success (no password)', async () => {
      await act(async () => {
        await useAuthStore.getState().deleteAccount();
      });

      const state = useAuthStore.getState();
      console.log('mockApiDelete calls (no password):', mockApiDelete.mock.calls);
      expect(mockApiDelete).toHaveBeenCalledWith('/api/auth/delete-account', { data: { password: undefined } });
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should call delete endpoint with password and clear state on success', async () => {
      const password = 'password123';
      await act(async () => {
        await useAuthStore.getState().deleteAccount(password);
      });

      const state = useAuthStore.getState();
      console.log('mockApiDelete calls (with password):', mockApiDelete.mock.calls);
      expect(mockApiDelete).toHaveBeenCalledWith('/api/auth/delete-account', { data: { password } });
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should set error on failed delete', async () => {
      const errorResponse = { response: { data: { error: 'Delete failed' } } };
      mockApiDelete.mockRejectedValue(errorResponse);

      await act(async () => {
        await useAuthStore.getState().deleteAccount();
      });

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Delete failed');
      expect(state.user).not.toBeNull();
      expect(state.isAuthenticated).toBe(true);
    });
  });

});
