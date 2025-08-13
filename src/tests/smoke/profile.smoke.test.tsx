import React from 'react';
import { render, screen } from '../utils/test-utils';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import ProfilePage from '../../../app/account/profile/page';

// Define the mock user state
const mockUserState = {
  user: { id: 'test-user', email: 'test@example.com', user_metadata: { first_name: 'Test', last_name: 'User' } },
  isAuthenticated: true,
  isLoading: false,
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  refreshToken: vi.fn(),
  handleSessionTimeout: vi.fn(),
  clearError: vi.fn(),
  clearSuccessMessage: vi.fn(),
  setUser: vi.fn(),
  setToken: vi.fn(),
  setupMFA: vi.fn(),
  verifyMFA: vi.fn(),
  disableMFA: vi.fn(),
  sendVerificationEmail: vi.fn(),
  setLoading: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
  deleteAccount: vi.fn(),
  verifyEmail: vi.fn(),
  mfaEnabled: false,
  mfaSecret: null,
  mfaQrCode: null,
  mfaBackupCodes: null,
  token: 'mock-token',
  rateLimitInfo: null,
  successMessage: null,
};

// Timer and memory debug helpers
const start = Date.now();
function logDebug(msg: string) {
  // eslint-disable-next-line no-console
  console.log(`[DEBUG][${((Date.now() - start) / 1000).toFixed(2)}s][${process.pid}] ${msg}`);
  if (global.gc) {
    global.gc();
  }
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const mem = process.memoryUsage();
    console.log(`[MEMORY] rss: ${(mem.rss / 1024 / 1024).toFixed(2)}MB heapUsed: ${(mem.heapUsed / 1024 / 1024).toFixed(2)}MB heapTotal: ${(mem.heapTotal / 1024 / 1024).toFixed(2)}MB`);
  }
}

beforeEach(() => {
  logDebug('Test started');
});
afterEach(() => {
  logDebug('Test finished');
});

// Mock the auth store to simulate an authenticated user and provide getState
const authStoreState = { ...mockUserState };
function useAuthStoreMock(selector?: any) {
  logDebug('useAuthStore called');
  if (!selector) return authStoreState;
  if (typeof selector === 'function') {
    try {
      return selector(authStoreState);
    } catch (e) {
      logDebug('useAuthStore selector threw: ' + (e instanceof Error ? e.message : String(e)));
      return undefined;
    }
  }
  return undefined;
}
useAuthStoreMock.getState = () => authStoreState;
useAuthStoreMock.setState = (partial: any) => Object.assign(authStoreState, typeof partial === 'function' ? partial(authStoreState) : partial);

vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: useAuthStoreMock,
}));

// Mock the profile store to provide a valid profile and required methods with robust debugging
const profileStoreState = {
  profile: {
    id: 'test-user',
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    userType: 'PRIVATE',
    companyName: '',
    companySize: null,
    industry: '',
    companyWebsite: '',
    position: '',
    department: '',
    vatId: '',
    address: null,
  },
  isLoading: false,
  error: null,
  fetchProfile: vi.fn(() => { logDebug('[MOCK] fetchProfile called'); }),
  updateBusinessProfile: vi.fn(() => { logDebug('[MOCK] updateBusinessProfile called'); }),
  updateProfile: vi.fn(() => { logDebug('[MOCK] updateProfile called'); }),
  convertToBusinessProfile: vi.fn(() => { logDebug('[MOCK] convertToBusinessProfile called'); }),
  uploadAvatar: vi.fn(() => { logDebug('[MOCK] uploadAvatar called'); }),
  removeAvatar: vi.fn(() => { logDebug('[MOCK] removeAvatar called'); }),
  uploadCompanyLogo: vi.fn(() => { logDebug('[MOCK] uploadCompanyLogo called'); }),
  removeCompanyLogo: vi.fn(() => { logDebug('[MOCK] removeCompanyLogo called'); }),
  clearError: vi.fn(() => { logDebug('[MOCK] clearError called'); }),
  verification: null,
  verificationLoading: false,
  verificationError: null,
  fetchVerificationStatus: vi.fn(() => { logDebug('[MOCK] fetchVerificationStatus called'); }),
  requestVerification: vi.fn(() => { logDebug('[MOCK] requestVerification called'); }),
};
function useProfileStoreMock(selector?: any) {
  logDebug('useProfileStore called');
  if (!selector) return profileStoreState;
  if (typeof selector === 'function') {
    try {
      const result = selector(profileStoreState);
      logDebug(`[MOCK] useProfileStore called with selector: ${selector.toString()} Result: ${JSON.stringify(result)}`);
      return result;
    } catch (e) {
      logDebug('useProfileStore selector threw: ' + (e instanceof Error ? e.message : String(e)));
      return undefined;
    }
  }
  return undefined;
}
useProfileStoreMock.getState = () => profileStoreState;
useProfileStoreMock.setState = (partial: any) => Object.assign(profileStoreState, typeof partial === 'function' ? partial(profileStoreState) : partial);

vi.mock('@/lib/stores/profile.store', () => ({
  useProfileStore: useProfileStoreMock,
}));

// Mock useUserProfile hook directly
vi.mock('@/hooks/user/useUserProfile', () => ({
  useUserProfile: vi.fn(() => ({
    profile: {
      id: 'test-user',
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      userType: 'PRIVATE',
    },
    isLoading: false,
    error: null,
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn(),
    removeAvatar: vi.fn(),
  })),
}));

// Mock useAccountSettings hook
vi.mock('@/hooks/user/useAccountSettings', () => ({
  useAccountSettings: vi.fn(() => ({})),
}));

// Mock ConnectedAccounts component to avoid accounts.map error
vi.mock('@/ui/styled/shared/ConnectedAccounts', () => ({
  ConnectedAccounts: () => <div data-testid="connected-accounts-mock">Connected Accounts Mock</div>,
}));

describe('Smoke: Profile Page', () => {
  it('renders profile page for authenticated user', () => {
    logDebug('Test: render ProfilePage');
    render(<ProfilePage />);
    logDebug('After render');
    // Check for the main page heading (h1) - actual text is "Profile Settings" from i18n
    expect(screen.getByRole('heading', { name: /profile settings/i, level: 1 })).toBeInTheDocument();
    logDebug('After expect');
    // Optionally check for user email or avatar if present
  });
}); 