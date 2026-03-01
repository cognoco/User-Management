import { vi, Mock } from 'vitest';
import { User } from '@/core/auth/models';
import { AuthState } from '@/types/auth';

// Type for mocked auth store
export type MockAuthStore = {
  [K in keyof AuthState]: AuthState[K] extends (...args: any[]) => any
    ? Mock<AuthState[K]>
    : AuthState[K];
};

// Helper type for creating mock store state
export interface MockAuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  error: string | null;
  isLoading: boolean;
}

// Type for API response mocks
export interface MockAuthResponse {
  data: {
    user: User;
    token: string;
  };
}

// Helper function to create a typed mock auth store
export const createMockAuthStore = (): MockAuthStore => ({
  isAuthenticated: false,
  user: null,
  token: null,
  error: null,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
  sendVerificationEmail: vi.fn(),
  verifyEmail: vi.fn(),
  clearError: vi.fn(),
  successMessage: null,
  rateLimitInfo: null,
  mfaEnabled: false,
  mfaSecret: null,
  mfaQrCode: null,
  mfaBackupCodes: null,
  clearSuccessMessage: vi.fn(),
  deleteAccount: vi.fn(),
  setUser: vi.fn(),
  setToken: vi.fn(),
  setupMFA: vi.fn(),
  verifyMFA: vi.fn(),
  disableMFA: vi.fn(),
  handleSessionTimeout: vi.fn(),
  refreshToken: vi.fn(),
  setLoading: vi.fn(),
});

// Shared mock generator for SAML config
export function createMockSamlConfig(overrides = {}) {
  return {
    type: 'saml',
    entity_id: 'https://test.idp.com',
    sign_in_url: 'https://test.idp.com/login',
    sign_out_url: 'https://test.idp.com/logout',
    certificate: '-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----',
    attribute_mapping: {
      email: 'email',
      name: 'name',
      role: 'role',
    },
    ...overrides,
  };
}

// Shared mock generator for OIDC config
export function createMockOidcConfig(overrides = {}) {
  return {
    type: 'oidc',
    client_id: 'client123',
    client_secret: 'secret123',
    discovery_url: 'https://test.idp.com/.well-known/openid-configuration',
    scopes: 'openid email profile',
    attribute_mapping: {
      email: 'email',
      name: 'name',
      role: 'role',
    },
    ...overrides,
  };
}
