// __tests__/integration/user-auth-flow.test.tsx
// This test has been verified to work with Vitest 3.1.3
// Note: This test relies on proper mock setup for auth stores and Supabase client
// See vitest.setup.ts and src/tests/mocks/supabase.ts for the required mock implementations

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Import specific forms instead of generic Auth
import { RegistrationForm } from '@/ui/styled/auth/RegistrationForm';
import LoginForm from '@/ui/styled/auth/LoginForm';
import { ProfileEditor } from '@/ui/styled/profile/ProfileEditor'; // Assuming ProfileEditor handles profile updates
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'; // Add SpyInstance
// Remove the module mock for auth.store
// vi.mock('@/lib/stores/auth.store', () => ({ ... })); 

// Import the actual store
// import { useAuth } from '@/hooks/auth/useAuth';

// Mock Supabase (using factory with dynamic import)
vi.mock('@/lib/database/supabase', () => import('@/tests/mocks/supabase'));
// Import the mocked supabase instance (Vitest redirects this)
import { supabase } from '@/lib/database/supabase';

// Import Profile type
import type { Profile } from '@/types/profile'; // Assuming type exists here
import type { User, RateLimitInfo } from '@/types/auth'; // Import types
// If ConnectedAccount is only used as a type, re-import it from the correct alias
// import type { ConnectedAccount } from '@/types/connected-accounts';

// --- Mock Profile Store with exported state object ---
const mockProfileStoreActions = {
  profile: null as Profile | null, // Allow Profile or null
  isLoading: false,
  error: null as string | null,
  fetchProfile: vi.fn().mockResolvedValue(undefined),
  updateProfile: vi.fn().mockResolvedValue(undefined),
  uploadAvatar: vi.fn().mockResolvedValue('mock-avatar-url'),
  removeAvatar: vi.fn().mockResolvedValue(true),
  updateBusinessProfile: vi.fn().mockResolvedValue(undefined),
  convertToBusinessProfile: vi.fn().mockResolvedValue(undefined),
  uploadCompanyLogo: vi.fn().mockResolvedValue('mock-logo-url'),
  removeCompanyLogo: vi.fn().mockResolvedValue(true),
  clearError: vi.fn(),
  // Add any other methods if needed
};

vi.mock('@/lib/stores/profile.store', () => ({
  useProfileStore: vi.fn(() => mockProfileStoreActions)
}));
// --- End Profile Store Mock ---

// --- Mock Connected Accounts Store ---
// import { useConnectedAccountsStore } from '@/lib/stores/connected-accounts.store';
// import { ConnectedAccount } from '@/types/connected-accounts';
// import { OAuthProvider } from '@/types/oauth';

import { createConnectedAccountsStoreMock } from '@/tests/mocks/connected-accounts.store.mock';

let mockConnectedAccountsStoreActions = createConnectedAccountsStoreMock();

vi.mock('@/lib/stores/connected-accounts.store', () => ({
  useConnectedAccountsStore: vi.fn(() => mockConnectedAccountsStoreActions)
}));
// --- End Connected Accounts Store Mock ---

// Zustand selector-compatible mock for useAuthStore, defined at the top for Vitest hoisting
vi.mock('@/hooks/auth/useAuth', () => {
  const createAuthStoreState = () => ({
    user: null as User | null,
    token: null as string | null,
    isLoading: false,
    isAuthenticated: false,
    error: null as string | null,
    successMessage: null as string | null,
    rateLimitInfo: null as RateLimitInfo | null,
    mfaEnabled: false,
    mfaSecret: null as string | null,
    mfaQrCode: null as string | null,
    mfaBackupCodes: null as string[] | null,
    login: vi.fn().mockImplementation(async (payload) => {
      // eslint-disable-next-line no-console
      console.log('[DEBUG] Mocked login via exported state CALLED:', payload);
      authStoreState.user = { id: 'test-user-id', email: payload.email } as User;
      authStoreState.isAuthenticated = true;
      return { success: true, requiresMfa: false };
    }),
    logout: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockImplementation(async (payload) => {
      // eslint-disable-next-line no-console
      console.log('[DEBUG] Mocked register via exported state CALLED:', payload);
      authStoreState.successMessage = 'Registration successful. Please check your email.';
      return { success: true };
    }),
    refreshToken: vi.fn().mockResolvedValue(true),
    handleSessionTimeout: vi.fn(),
    clearError: vi.fn().mockImplementation(() => { authStoreState.error = null; }),
    clearSuccessMessage: vi.fn().mockImplementation(() => { authStoreState.successMessage = null; }),
    setUser: vi.fn((user: User | null) => { authStoreState.user = user; }),
    setToken: vi.fn((token: string | null) => { authStoreState.token = token; }),
    setupMFA: vi.fn().mockResolvedValue({ success: true }),
    verifyMFA: vi.fn().mockResolvedValue({ success: true }),
    disableMFA: vi.fn().mockResolvedValue({ success: true }),
    sendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
    setLoading: vi.fn((loading: boolean) => { authStoreState.isLoading = loading; }),
    resetPassword: vi.fn().mockResolvedValue({ success: true }),
    updatePassword: vi.fn().mockResolvedValue({ success: true }),
    deleteAccount: vi.fn().mockResolvedValue({ success: true }),
    verifyEmail: vi.fn().mockResolvedValue({ success: true }),
  });
  let authStoreState = createAuthStoreState();
  const useAuthStoreMock: any = vi.fn((selector: any) => (typeof selector === 'function' ? selector(authStoreState) : authStoreState));
  useAuthStoreMock.setState = (newState: any) => {
    authStoreState = { ...createAuthStoreState(), ...newState };
  };
  (global as any).__useAuthStoreMock = useAuthStoreMock;
  return {
    useAuth: useAuthStoreMock
  };
});

import { UserManagementProvider } from '@/lib/auth/UserManagementProvider';
import { OAuthProvider } from '@/types/oauth';

describe('User Authentication Flow', () => {
  let user: ReturnType<typeof userEvent.setup>;
  // Remove spy variable
  // let loginSpy: SpyInstance;

  beforeEach(() => {
    // Clear mock call history and reset state if necessary
    vi.clearAllMocks(); 
    // Reset Zustand selector-compatible auth store mock
    if ((global as any).__useAuthStoreMock?.setState) {
      (global as any).__useAuthStoreMock.setState({});
    }
    // Reset connected accounts store state
    mockConnectedAccountsStoreActions = createConnectedAccountsStoreMock();
    // Reset profile store state
    mockProfileStoreActions.profile = null;
    mockProfileStoreActions.isLoading = false;
    mockProfileStoreActions.error = null;
    
    user = userEvent.setup();
  });

  // Add afterEach if timers or other global mocks need restoring
  afterEach(() => {
    vi.restoreAllMocks(); // Ensure all mocks are fully reset after each test
  });

  test('User can sign up, login, and update profile', async () => {
    try {
      // Get refs to mock functions from the selector-compatible mock
      const mockLogin = (global as any).__useAuthStoreMock().login;
      const mockRegister = (global as any).__useAuthStoreMock().register;
      const mockUpdateProfile = mockProfileStoreActions.updateProfile;
      // Add mockUploadAvatar if we want to test that too
      // const mockUploadAvatar = mockProfileStoreActions.uploadAvatar;

      // 1. SIGN UP FLOW
      const { unmount: unmountSignup } = render(<RegistrationForm />); 

      // Fill sign up form
      await act(async () => {
        await user.type(screen.getByTestId('email-input'), 'test@example.com');
      });
      await act(async () => {
        await user.type(screen.getByTestId('password-input'), 'Password123');
      });
      await act(async () => {
        await user.type(screen.getByTestId('first-name-input'), 'Test');
      });
      await act(async () => {
        await user.type(screen.getByTestId('last-name-input'), 'User');
      });
      await act(async () => {
        await user.type(screen.getByTestId('confirm-password-input'), 'Password123');
      });
      await act(async () => {
        await user.click(screen.getByTestId('accept-terms-checkbox'));
      });

      // Submit sign up form 
      await act(async () => {
        await user.click(screen.getByRole('button', { name: /create account/i }));
      });

      // Verify mockRegister was called
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalled();
        // Optional: Check arguments if needed
        expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({
          email: 'test@example.com', 
          password: 'Password123',
          firstName: 'Test',
          lastName: 'User'
        }));
      }, { timeout: 2000 });
      // Check for success message (can check state or UI)
      expect((global as any).__useAuthStoreMock().successMessage).toContain('Registration successful'); // Check state
      expect(await screen.findByRole('alert')).toHaveTextContent(/Registration successful/i); // Check UI

      unmountSignup();

      // 2. LOGIN FLOW
      const { unmount: unmountLogin } = render(<LoginForm />); 

      // Fill login form
      await act(async () => {
        await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      });
      await act(async () => {
        await user.type(screen.getByLabelText(/^Password$/i), 'Password123');
      });

      // Submit login form (use act)
      await act(async () => {
        await user.click(screen.getByRole('button', { name: /login/i }));
      });

      // Check the mockLogin function from the imported object
      expect(mockLogin, 'Expected login function from exported mock state to be called').toHaveBeenCalled();
      expect(mockLogin, 'Expected login function to be called with specific arguments').toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123',
        rememberMe: false, // Include rememberMe based on defaultValues in LoginForm
      });

      unmountLogin();

      // 3. PROFILE UPDATE FLOW
      // Supabase mocks for getUser are still needed by ProfileEditor potentially
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } }, 
        error: null
      });
      // No need to mock supabase.from('profiles')... calls directly anymore
      // const profileQueryBuilder = supabase.from('profiles');
      // ((profileQueryBuilder as any).single as any).mockResolvedValueOnce({ ... });
      // (supabase.from as any)('profiles').upsert.mockResolvedValueOnce({ error: null });

      // Simulate profile existing in the store. 
      // ProfileEditor likely uses auth user for email and maybe defaults name internally.
      // Only include fields from Profile type that might be read initially.
      mockProfileStoreActions.profile = {
        id: 'test-user-id',
        bio: '', 
        website: '',
        avatar_url: null,
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString(), 
      };

      render(<ProfileEditor />);

      // Wait for editor to load
      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
        // Removed check for email field, as ProfileEditor does not render it
      }, { timeout: 2000 });

      // Fill and submit profile form
      // Ensure email field is populated to pass validation
      await user.clear(screen.getByLabelText(/name/i));
      await user.type(screen.getByLabelText(/name/i), 'Test User Updated');
      await user.clear(screen.getByLabelText(/website/i));
      await user.type(screen.getByLabelText(/website/i), 'https://updated.example.com');
      await user.clear(screen.getByLabelText(/bio/i));
      await user.type(screen.getByLabelText(/bio/i), 'Test bio');
      await user.clear(screen.getByLabelText(/location/i));
      await user.type(screen.getByLabelText(/location/i), 'Test location');

      // Wrap the submission click in act
      await act(async () => {
        await user.click(screen.getByRole('button', { name: /save profile/i }));
      });

      // Verify profile store updateProfile was called with the FORM data payload
      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          name: 'Test User Updated',
          bio: 'Test bio',
          location: 'Test location', // Expect location based on previous error msg
          website: 'https://updated.example.com',
        });
      }, { timeout: 2000 });
    } catch (err) {
      // Log the DOM for debugging if the test fails
      // eslint-disable-next-line no-console
      console.error('Test failed, DOM snapshot:');
      screen.debug();
      throw err;
    }
  });

  test('Social login buttons (Google/Apple) are visible in Login and Registration forms', async () => {
    // Provide UserManagementProvider with Google and Apple enabled
    const oauthConfig = {
      enabled: true,
      providers: [
        {
          provider: OAuthProvider.GOOGLE,
          clientId: 'test-google-client-id',
          redirectUri: 'http://localhost/callback/google',
          enabled: true,
        },
        {
          provider: OAuthProvider.APPLE,
          clientId: 'test-apple-client-id',
          redirectUri: 'http://localhost/callback/apple',
          enabled: true,
        },
      ],
      autoLink: true,
      allowUnverifiedEmails: false,
      defaultRedirectPath: '/',
    };
    const userManagementConfig = { oauth: oauthConfig };

    // Registration Form
    const { unmount: unmountSignup } = render(
      <UserManagementProvider config={userManagementConfig}>
        <RegistrationForm />
      </UserManagementProvider>
    );
    expect(screen.getByRole('button', { name: /sign up with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up with apple/i })).toBeInTheDocument();
    unmountSignup();

    // Login Form
    const { unmount: unmountLogin } = render(
      <UserManagementProvider config={userManagementConfig}>
        <LoginForm />
      </UserManagementProvider>
    );
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with apple/i })).toBeInTheDocument();
    unmountLogin();
  });
});
