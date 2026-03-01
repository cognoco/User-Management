import { vi, Mock } from 'vitest';
import type { AuthDataProvider } from '@/adapters/auth/interfaces';
import type { User, LoginPayload, RegistrationPayload, AuthResult, MFASetupResponse, MFAVerifyResponse } from '@/core/auth/models';

export interface MockAuthState {
  user: User | null;
  token: string | null;
  role?: string;
  permissions?: string[];
  metadata?: Record<string, unknown>;
}

export interface MockSupabaseAuthProvider extends AuthDataProvider {
  state: MockAuthState;
  setUser(user: User | null): void;
}

/**
 * Create a mock implementation of {@link SupabaseAuthProvider}.
 *
 * The mock exposes a mutable {@link state} object to control authentication
 * status in tests. All methods are Vitest spies so tests can assert calls.
 */
export function createMockSupabaseAuthProvider(
  initialState: Partial<MockAuthState> = {},
): MockSupabaseAuthProvider {
  const state: MockAuthState = {
    user: null,
    token: null,
    role: undefined,
    permissions: [],
    metadata: {},
    ...initialState,
  };

  const provider: Partial<MockSupabaseAuthProvider> = {
    state,

    setUser(user: User | null) {
      state.user = user;
      state.token = user ? 'mock-token' : null;
    },

    login: vi.fn(async (_payload: LoginPayload): Promise<AuthResult> => {
      state.user = {
        id: 'user-123',
        email: _payload.email,
        firstName: '',
        lastName: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mfaEnabled: false,
      };
      state.token = 'mock-token';
      return { success: true, user: state.user ?? undefined };
    }),

    register: vi.fn(async (_payload: RegistrationPayload): Promise<AuthResult> => {
      return provider.login!({ email: _payload.email, password: _payload.password });
    }),

    logout: vi.fn(async () => {
      state.user = null;
      state.token = null;
    }),

    getCurrentUser: vi.fn(async () => state.user),

    resetPassword: vi.fn(async (_email: string) => ({ success: true })),
    updatePassword: vi.fn(async (_oldPassword: string, _newPassword: string) => {}),
    sendVerificationEmail: vi.fn(async (_email: string) => ({ success: true })),
    verifyEmail: vi.fn(async (_token: string) => {}),
    sendMagicLink: vi.fn(async (_email: string) => ({ success: true })),
    verifyMagicLink: vi.fn(async (_token: string) => ({ success: true })),
    deleteAccount: vi.fn(async (_password?: string) => {}),
    setupMFA: vi.fn(async (): Promise<MFASetupResponse> => ({ success: true, secret: 'secret', qrCode: 'qr' })),
    verifyMFA: vi.fn(async (_code: string): Promise<MFAVerifyResponse> => ({ success: true, token: 'mock-token' })),
    disableMFA: vi.fn(async (_code: string) => ({ success: true })),
    startWebAuthnRegistration: vi.fn(async (): Promise<MFASetupResponse> => ({ success: true, secret: 'secret', qrCode: 'qr' })),
    verifyWebAuthnRegistration: vi.fn(async (_data: unknown): Promise<MFAVerifyResponse> => ({ success: true, token: 'mock-token' })),
    refreshToken: vi.fn(async () => ({ accessToken: 'refreshed-token', refreshToken: 'refresh', expiresAt: Date.now() + 60_000 })),
    onAuthStateChanged: vi.fn((cb: (user: User | null) => void) => {
      cb(state.user);
      return vi.fn();
    }),
    invalidateSessions: vi.fn(async (_userId: string) => {}),
    handleSessionTimeout: vi.fn(),
  };

  return provider as MockSupabaseAuthProvider;
}
