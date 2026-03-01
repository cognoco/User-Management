import { vi } from 'vitest';

declare global {
  // eslint-disable-next-line no-var
  var __TEST_ORG__: import('@/lib/hooks/useOrganization').Organization | undefined;
  // eslint-disable-next-line no-var
  var __TEST_ORG_ERROR__: string | undefined;
}

vi.mock('@/lib/database/supabase', async () => (await import('@/tests/mocks/supabase')));
vi.mock('@/lib/auth/UserManagementProvider', () => ({
  useUserManagement: () => ({
    oauth: {
      enabled: true,
      providers: [
        { provider: 'microsoft' },
        { provider: 'google' },
        { provider: 'linkedin' },
      ],
    },
  }),
}));

import '@/tests/i18nTestSetup';
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BusinessSSOAuth } from '@/ui/styled/auth/BusinessSSOAuth';
import { OrganizationProvider } from '@/lib/context/OrganizationContext';
import { describe, test, expect, beforeEach, afterEach } from 'vitest';

// Import our standardized mock using vi.mock with async import
import { supabase } from '@/lib/database/supabase';

// Store original window location
const originalLocation = window.location;

// Mock useOrganization at the very top, before any other imports
vi.mock('@/lib/hooks/useOrganization', () => ({
  useOrganization: () => ({
    organization: globalThis.__TEST_ORG__ || {
      id: 'org-123',
      name: 'Acme Inc',
      domain: 'acme.com',
      sso_enabled: true,
      sso_provider: 'microsoft' as const,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('Business SSO Authentication Flows', () => {
  let user: ReturnType<typeof userEvent.setup>;

  // Sample organization data
  const mockOrganization = {
    id: 'org-123',
    name: 'Acme Inc',
    domain: 'acme.com',
    sso_enabled: true,
    sso_provider: 'microsoft' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    globalThis.__TEST_ORG__ = mockOrganization;
    // Mock window.location for redirects using vi.fn
    const mockWindowLocationAssign = vi.fn();
    Object.defineProperty(window, 'location', {
      value: {
        assign: mockWindowLocationAssign,
        origin: 'https://app.example.com',
        href: 'https://app.example.com/auth',
        hash: '' // Ensure hash is always defined
      },
      writable: true,
      configurable: true
    });
    // Mock auth state (not authenticated)
    (supabase.auth.getUser as vi.Mock).mockResolvedValue({
      data: { user: null },
      error: null
    });
    // Remove per-test supabase.from mock implementation (now handled globally)
  });

  afterEach(() => {
    // Restore original window.location
    Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true
    });
    delete globalThis.__TEST_ORG__;
    delete globalThis.__TEST_ORG_ERROR__;
  });

  test('User can sign in with Microsoft/Azure AD', async () => {
    // Set org to use 'microsoft' as sso_provider
    globalThis.__TEST_ORG__ = {
      id: 'org-123',
      name: 'Acme Inc',
      domain: 'acme.com',
      sso_enabled: true,
      sso_provider: 'microsoft' as const,
    };
    // Mock successful Microsoft auth
    (supabase.auth.signInWithOAuth as vi.Mock).mockResolvedValueOnce({
      data: { provider: 'microsoft', url: 'https://supabase-auth.io/microsoft-redirect' },
      error: null
    });

    render(
      <BusinessSSOAuth domain="acme.com" />
    );

    await waitFor(() => {
      expect(screen.getByText(/acme inc/i)).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /sign in with microsoft/i }));
    });

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'microsoft',
      options: expect.objectContaining({
        redirectTo: expect.stringContaining(window.location.origin),
        queryParams: expect.objectContaining({
          organization_id: 'org-123'
        })
      })
    });
    expect((window.location.assign as vi.Mock)).toHaveBeenCalledWith('https://supabase-auth.io/microsoft-redirect');
  });

  test('User can sign in with Google Workspace', async () => {
    // Set org to use 'google' as sso_provider
    globalThis.__TEST_ORG__ = {
      id: 'org-123',
      name: 'Acme Inc',
      domain: 'acme.com',
      sso_enabled: true,
      sso_provider: 'google' as const,
    };
    (supabase.auth.signInWithOAuth as vi.Mock).mockResolvedValueOnce({
      data: { provider: 'google', url: 'https://supabase-auth.io/google-redirect' },
      error: null
    });

    render(
      <BusinessSSOAuth domain="acme.com" />
    );

    await waitFor(() => {
      expect(screen.getByText(/acme inc/i)).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /sign in with google/i }));
    });

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: expect.objectContaining({
        queryParams: expect.objectContaining({
          access_type: 'offline',
          hd: 'acme.com',
          organization_id: 'org-123'
        })
      })
    });
    expect((window.location.assign as vi.Mock)).toHaveBeenCalledWith('https://supabase-auth.io/google-redirect');
  });

  test('Business LinkedIn SSO authentication', async () => {
    // Set org to use 'linkedin' as sso_provider
    globalThis.__TEST_ORG__ = {
      id: 'org-123',
      name: 'Acme Inc',
      domain: 'acme.com',
      sso_enabled: true,
      sso_provider: 'linkedin' as const,
    };
    (supabase.auth.signInWithOAuth as vi.Mock).mockResolvedValueOnce({
      data: { provider: 'linkedin', url: 'https://supabase-auth.io/linkedin-redirect' },
      error: null
    });

    render(
      <BusinessSSOAuth domain="acme.com" />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/acme inc/i)).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /sign in with linkedin/i }));
    });

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'linkedin',
      options: expect.objectContaining({
        scopes: 'r_emailaddress r_liteprofile',
        queryParams: expect.objectContaining({
          organization_id: 'org-123'
        })
      })
    });
    expect((window.location.assign as vi.Mock)).toHaveBeenCalledWith('https://supabase-auth.io/linkedin-redirect');
  });

  test('Domain-based organization auto-assignment', async () => {
    // Mock user with corporate email
    const userWithCorporateEmail = {
      id: 'user-456',
      email: 'employee@acme.com'
    };
    
    // Mock successful login without organization
    (supabase.auth.signInWithOAuth as vi.Mock).mockResolvedValueOnce({
      data: { provider: 'microsoft', url: 'https://supabase-auth.io/microsoft-redirect' },
      error: null
    });
    
    // Mock organization domains query
    const makeBuilder = (): Record<string, any> => {
      const builder: Record<string, any> = {};
      builder.select = vi.fn().mockReturnValue(builder);
      builder.eq = vi.fn().mockReturnValue(builder);
      builder.insert = vi.fn().mockReturnValue(builder);
      builder.single = vi.fn().mockReturnValue(builder);
      return builder;
    };
    (supabase.from as vi.Mock).mockImplementation((table: string) => {
      if (table === 'organization_domains') {
        const builder = makeBuilder();
        builder.then = (resolve: any, reject: any) => Promise.resolve({
          data: [{ org_id: 'org-123', domain: 'acme.com', is_verified: true }],
          error: null
        }).then(resolve, reject);
        return builder;
      } else if (table === 'organization_members') {
        const builder = makeBuilder();
        builder.insert = vi.fn().mockResolvedValue({ data: [], error: null });
        return builder;
      } else if (table === 'organizations') {
        const builder = makeBuilder();
        builder.single = vi.fn().mockResolvedValue({ data: mockOrganization, error: null });
        return builder;
      }
      return makeBuilder();
    });

    // Simulate auth callback with corporate email
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'https://app.example.com',
        hash: '#access_token=test-token&provider=microsoft&type=sso',
        href: 'https://app.example.com/auth/callback#access_token=test-token&provider=microsoft&type=sso'
      },
      writable: true
    });
    
    // Mock session with corporate email
    (supabase.auth.getSession as vi.Mock).mockResolvedValueOnce({
      data: { 
        session: { 
          access_token: 'test-token',
          user: userWithCorporateEmail
        }
      },
      error: null
    });
    
    // Render component with domain detection
    render(<BusinessSSOAuth domain="acme.com" />);
    
    // Assert that the UI shows the redirecting message and no error is displayed
    await waitFor(() => {
      expect(screen.getByText(/redirecting to organization/i)).toBeInTheDocument();
      expect(screen.queryByRole('alert', { name: /error/i })).not.toBeInTheDocument();
    });
    
    // Clean up
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true
    });
  });

  test('Organization-wide SSO enforcement', async () => {
    // Mock authenticated user without SSO
    (supabase.auth.getUser as vi.Mock).mockReset();
    (supabase.auth.getUser as vi.Mock).mockResolvedValue({
      data: { 
        user: { 
          id: 'user-789', 
          email: 'user@acme.com',
          app_metadata: { provider: 'email' } // Using email login instead of SSO
        }
      },
      error: null
    });
    
    // Update mock organization to enforce SSO
    (supabase.from as vi.Mock).mockReset();
    (supabase.from as vi.Mock).mockImplementation((table: string) => {
      if (table === 'organizations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { 
              ...mockOrganization, 
              sso_forced: true, // Force SSO for organization
              allow_email_login: false
            },
            error: null
          })
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      };
    });
    
    // Render business SSO component
    render(
      <OrganizationProvider orgId="org-123">
        <BusinessSSOAuth domain="acme.com" />
      </OrganizationProvider>
    );
    
    // Verify SSO enforcement message
    await waitFor(() => {
      expect(screen.getByText('Sign in with your organization account')).toBeInTheDocument();
    });
    
    // Verify standard login option is not rendered
    expect(screen.queryByRole('button', { name: /sign in with email/i })).toBeNull();
  });
});
