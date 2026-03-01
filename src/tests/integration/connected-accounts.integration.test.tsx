import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConnectedAccounts } from '@/ui/styled/shared/ConnectedAccounts'; // Corrected import path
import { useConnectedAccountsStore } from '@/lib/stores/connected-accounts.store'; // CORRECT STORE
import { createConnectedAccountsStoreMock } from '@/tests/mocks/connected-accounts.store.mock';
import { useUserManagement } from '@/lib/auth/UserManagementProvider';
import { OAuthProvider } from '@/types/oauth'; // Import OAuthProvider if needed
import { ConnectedAccount } from '@/types/connected-accounts'; // Import ConnectedAccount type
import { IntegrationCallbacks, LayoutOptions } from '@/lib/auth/UserManagementProvider';
import { SubscriptionTier } from '@/types/subscription';
import { UserType } from '@/types/user-type';

// Mock necessary dependencies
vi.mock('@/lib/stores/connected-accounts.store');
vi.mock('@/lib/auth/UserManagementProvider');

const mockDisconnectAccount = vi.fn();
const mockConnectAccount = vi.fn();
const mockFetchConnectedAccounts = vi.fn();
const mockUseConnectedAccountsStore = vi.mocked(useConnectedAccountsStore);
const mockUseUserManagement = vi.mocked(useUserManagement);

// Define default values based on UserManagementProvider defaults
const defaultCallbacks: Required<IntegrationCallbacks> = {
  onUserLogin: () => {},
  onUserLogout: () => {},
  onProfileUpdate: () => {},
  onError: () => {},
};

const defaultLayout: Required<LayoutOptions> = {
  useCustomHeader: false,
  headerComponent: null,
  useCustomFooter: false,
  footerComponent: null,
  useCustomLayout: false,
  layoutComponent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
};

describe('ConnectedAccounts Integration Tests', () => {

  const mockAccounts: ConnectedAccount[] = [
    { id: 'acc-1', userId: 'user-123', provider: OAuthProvider.GOOGLE, providerAccountId: 'google-123', providerEmail: 'test@google.com', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'acc-2', userId: 'user-123', provider: OAuthProvider.GITHUB, providerAccountId: 'github-456', providerEmail: 'test@github.com', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for Connected Accounts Store
    mockUseConnectedAccountsStore.mockReturnValue(
      createConnectedAccountsStoreMock({
        accounts: mockAccounts,
        isLoading: false,
        error: null,
        fetchConnectedAccounts: mockFetchConnectedAccounts,
        connectAccount: mockConnectAccount,
        disconnectAccount: mockDisconnectAccount,
      })
    );

     // Default mock for User Management context - Add ALL required properties
     mockUseUserManagement.mockReturnValue({
      config: { // Keep existing config, add others if needed by component under test
        // Add specific config properties used by ConnectedAccounts if any
      },
      callbacks: defaultCallbacks, // Use defined default
      layout: defaultLayout, // Use defined default
      platform: 'web',
      isNative: false,
      ui: {}, // Empty object if no specific components are needed
      api: {}, // Placeholder for API object if needed
      storageKeyPrefix: 'user',
      i18nNamespace: 'userManagement',
      twoFactor: { // Default values based on provider
        enabled: false,
        methods: [],
        required: false,
      },
      subscription: { // Default values based on provider
        enabled: false,
        defaultTier: SubscriptionTier.FREE, // Use enum member
        features: {},
        enableBilling: false,
      },
      corporateUsers: { // Default values based on provider
        enabled: false,
        registrationEnabled: true,
        requireCompanyValidation: false,
        allowUserTypeChange: false,
        companyFieldsRequired: ['name'],
        defaultUserType: UserType.PRIVATE, // Use enum member
      },
      oauth: { // Existing oauth mock
        enabled: true,
        providers: [
          { provider: OAuthProvider.GOOGLE, clientId: 'google-client-id', redirectUri: 'http://localhost/callback/google', enabled: true },
          { provider: OAuthProvider.GITHUB, clientId: 'github-client-id', redirectUri: 'http://localhost/callback/github', enabled: true },
          { provider: OAuthProvider.FACEBOOK, clientId: 'facebook-client-id', redirectUri: 'http://localhost/callback/facebook', enabled: true },
        ],
        autoLink: true,
        allowUnverifiedEmails: false,
        defaultRedirectPath: '/',
      },
    });
  });

  it('should render currently connected accounts', async () => {
    // Arrange
    render(<ConnectedAccounts />);

    // Assert
    // Use within to scope to each account block
    const googleAccountEl = await screen.findByText('test@google.com');
    const googleAccount = googleAccountEl.closest('div');
    const githubAccountEl = await screen.findByText('test@github.com');
    const githubAccount = githubAccountEl.closest('div');
    expect(googleAccount).toBeInTheDocument();
    expect(githubAccount).toBeInTheDocument();
    // Check provider label within each account
    expect(within(googleAccount!).getByText('Google')).toBeInTheDocument();
    expect(within(githubAccount!).getByText('GitHub')).toBeInTheDocument();
    // Check disconnect buttons by aria-label
    expect(screen.getByRole('button', { name: 'Disconnect Google account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disconnect GitHub account' })).toBeInTheDocument();
  });

  it('should call disconnectAccount when disconnect button is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ConnectedAccounts />);
    const googleDisconnect = screen.getByRole('button', { name: 'Disconnect Google account' });

    // Act
    await user.click(googleDisconnect);

    // Assert
    expect(mockDisconnectAccount).toHaveBeenCalledTimes(1);
    expect(mockDisconnectAccount).toHaveBeenCalledWith(mockAccounts[0].id);
  });

  it('should render buttons for available providers to connect', async () => {
    // Arrange
    render(<ConnectedAccounts />);

    // Assert
    // Check that buttons render for providers *not* already connected
    expect(screen.getByRole('button', { name: 'Connect Facebook account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Facebook account' })).not.toBeDisabled();

    // Check that already connected providers are disabled
    expect(screen.getByRole('button', { name: 'Connect Google account' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Connect GitHub account' })).toBeDisabled();

    // Check for the connect new account section header (i18n fallback or English)
    const connectNewAccount = await screen.findByText('Connect new account');
    expect(connectNewAccount).toBeInTheDocument();
  });

  // Add tests for:
  // - Error states when fetching/displaying accounts
  // - Error states during unlinking
  // - Loading states
  // - Empty state (no connected accounts)
  // - Interaction with confirmation dialogs if they exist

}); 