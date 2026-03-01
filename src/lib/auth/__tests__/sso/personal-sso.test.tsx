// __tests__/auth/sso/personal-sso.test.js

import { vi, describe, beforeEach, test, expect } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/database/supabase', async () => {
  const mockSupabaseModule = await import('@/tests/mocks/supabase');
  return { supabase: mockSupabaseModule.supabase };
});

import React, { ReactElement } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BusinessSSOAuth } from '@/ui/styled/auth/BusinessSSOAuth';
import { supabase } from '@/lib/database/supabase';
import * as useOrganizationModule from '@/lib/hooks/useOrganization';
import { UserManagementProvider } from '@/lib/auth/UserManagementProvider';
import { OAuthProvider } from '@/types/oauth';

// Store original window location
const originalLocation = window.location;

// Mock useOrganization to always return an enabled org
const orgMock: any = {
  id: 'org-123',
  name: 'Test Org',
  domain: 'example.com',
  sso_enabled: true,
  sso_provider: 'google',
};
vi.spyOn(useOrganizationModule, 'useOrganization').mockImplementation(() => ({
  organization: orgMock,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
}));

// Helper to wrap with UserManagementProvider
function renderWithProvider(ui: ReactElement) {
  return render(
    <UserManagementProvider
      config={{
        oauth: {
          enabled: true,
          providers: [
            { provider: OAuthProvider.GITHUB, enabled: true, clientId: 'test', redirectUri: 'http://localhost' },
            { provider: OAuthProvider.GOOGLE, enabled: true, clientId: 'test', redirectUri: 'http://localhost' },
            { provider: OAuthProvider.FACEBOOK, enabled: true, clientId: 'test', redirectUri: 'http://localhost' },
            { provider: OAuthProvider.APPLE, enabled: true, clientId: 'test', redirectUri: 'http://localhost' },
          ],
          autoLink: true,
          allowUnverifiedEmails: false,
          defaultRedirectPath: '/',
        },
      }}
    >
      {ui}
    </UserManagementProvider>
  );
}

// Add after supabase import
const supabaseAuth = supabase.auth as any;
const mockGetUser = supabaseAuth.getUser as Mock<any>;
const mockSignInWithOAuth = supabaseAuth.signInWithOAuth as Mock<any>;
const mockGetSession = supabaseAuth.getSession as Mock<any>;

describe('Personal SSO Authentication Flows', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockWindowLocationAssign: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    
    // Mock window.location for redirects
    mockWindowLocationAssign = vi.fn();
    Object.defineProperty(window, 'location', {
      value: {
        assign: mockWindowLocationAssign,
        origin: 'https://app.example.com',
        href: 'https://app.example.com/auth',
        hash: '', // Ensure hash is always defined
      },
      writable: true,
      configurable: true
    });

    // Mock auth state
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null
    });
  });

  afterEach(() => {
    // Restore original window.location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true
    });
    window.location.hash = '';
  });

  test('User can sign in with GitHub', async () => {
    orgMock.sso_provider = 'github';
    // Mock successful GitHub auth
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: { provider: 'github', url: 'https://supabase-auth.io/github-redirect' },
      error: null
    });

    // Render SSO auth component
    renderWithProvider(<BusinessSSOAuth />);
    
    // Click GitHub button
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /github/i }));
    });
    
    // Verify Supabase auth method was called with correct params
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'github',
      options: expect.objectContaining({
        redirectTo: expect.stringContaining(window.location.origin)
      })
    });
    
    // Verify user is redirected to GitHub auth URL
    expect(mockWindowLocationAssign).toHaveBeenCalledWith('https://supabase-auth.io/github-redirect');
  });

  test('User can sign in with Google', async () => {
    orgMock.sso_provider = 'google';
    // Mock successful Google auth
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: { provider: 'google', url: 'https://supabase-auth.io/google-redirect' },
      error: null
    });

    // Render SSO auth component
    renderWithProvider(<BusinessSSOAuth />);
    
    // Click Google button
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /google/i }));
    });
    
    // Verify Supabase auth method was called
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: expect.objectContaining({
        redirectTo: expect.stringContaining(window.location.origin)
      })
    });
    
    // Verify user is redirected to Google auth URL
    expect(mockWindowLocationAssign).toHaveBeenCalledWith('https://supabase-auth.io/google-redirect');
  });

  test('Handles SSO error gracefully', async () => {
    orgMock.sso_provider = 'facebook';
    // Mock auth error
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: null,
      error: { message: 'Authentication failed' }
    });

    // Render SSO auth component
    renderWithProvider(<BusinessSSOAuth />);
    
    // Click Facebook button
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /facebook/i }));
    });
    
    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
    });
    
    // Verify no redirect happened
    expect(mockWindowLocationAssign).not.toHaveBeenCalled();
  });

  test('User can authenticate with Apple', async () => {
    orgMock.sso_provider = 'apple';
    // Mock successful Apple auth
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: { provider: 'apple', url: 'https://supabase-auth.io/apple-redirect' },
      error: null
    });

    // Render SSO auth component
    renderWithProvider(<BusinessSSOAuth />);
    
    // Click Apple button
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /apple/i }));
    });
    
    // Verify Supabase auth method was called
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'apple',
      options: expect.objectContaining({
        redirectTo: expect.stringContaining(window.location.origin)
      })
    });
    
    // Verify user is redirected to Apple auth URL
    expect(mockWindowLocationAssign).toHaveBeenCalledWith('https://supabase-auth.io/apple-redirect');
  });

  test('SSO auth with scopes and additional options', async () => {
    orgMock.sso_provider = 'github';
    // Set test-specific scopes
    (window as any).TEST_SSO_SCOPES = 'repo,user';
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: { provider: 'github', url: 'https://supabase-auth.io/github-redirect' },
      error: null
    });

    renderWithProvider(<BusinessSSOAuth />);
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /github/i }));
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'github',
      options: expect.objectContaining({
        scopes: 'repo,user',
        redirectTo: expect.stringContaining(window.location.origin)
      })
    });
    expect(mockWindowLocationAssign).toHaveBeenCalledWith('https://supabase-auth.io/github-redirect');
    // Clean up
    delete (window as any).TEST_SSO_SCOPES;
  });

  test('Handles SSO callback URL parameters correctly', async () => {
    orgMock.sso_provider = 'github';
    // Set test-specific callback flag
    (window as any).TEST_SSO_CALLBACK = true;
    // Set window.location.hash to simulate SSO callback
    window.location.hash = '#access_token=123&type=sso';
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: { provider: 'github', url: 'https://supabase-auth.io/github-redirect' },
      error: null
    });
    // Mock a valid session with user and email
    mockGetSession.mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: 'user-1',
            email: 'testuser@example.com',
          },
        },
      },
      error: null,
    });
    // Set global mock data for organization_domains
    const { setTableMockData } = await import('@/tests/mocks/supabase');
    setTableMockData('organization_domains', {
      data: [{ domain: 'example.com', is_verified: true, org_id: orgMock.id }],
      error: null,
    });

    renderWithProvider(<BusinessSSOAuth />);
    // No button click: component is in redirecting state
    // Assert that session check was performed
    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
    });
    // Assert that the redirecting alert is present
    expect(screen.getByRole('alert')).toHaveTextContent(/redirecting/i);
    // Clean up
    delete (window as any).TEST_SSO_CALLBACK;
    window.location.hash = '';
  });
});
