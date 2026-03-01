// __tests__/auth/session/business-policies.test.js

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrganizationSessionManager } from '@/ui/styled/company/OrganizationSessionManager';
import { OrganizationProvider } from '@/lib/context/OrganizationContext';
import { UserManagementProvider } from '@/lib/auth/UserManagementProvider';
import { vi, describe, beforeEach, test, expect, afterEach } from 'vitest';
import type { Mock } from 'vitest';

// IMPORTANT: Mock the real Supabase client before anything else
vi.mock('@supabase/supabase-js', async () => (await import('@/tests/mocks/supabase')));

// IMPORTANT: Mock must be first to ensure all imports use the mock
vi.mock('../../../../lib/database/supabase', async () => (await import('@/tests/mocks/supabase')));
import { supabase } from '@/lib/database/supabase';

// Cast supabase to any for mock method access — the real types don't expose vi.Mock helpers
const mockSupabase = supabase as any;

describe('MOCK DIAGNOSTIC', () => {
  test('supabase.from returns a function with .select', () => {
    const builder = mockSupabase.from('organizations');
    // eslint-disable-next-line no-console
    console.log('MOCK DIAGNOSTIC builder:', builder, Object.keys(builder));
    expect(typeof builder).toBe('function');
    expect(typeof builder.select).toBe('function');
    expect(typeof builder.eq).toBe('function');
    expect(typeof builder.single).toBe('function');
    expect(typeof builder.then).toBe('function');
  });
});

describe('DEBUG: Supabase mock shape', () => {
  test('supabase.from returns an object with .select', () => {
    const builder = mockSupabase.from('organizations');
    // eslint-disable-next-line no-console
    console.log('DEBUG builder:', builder);
    expect(typeof builder.select).toBe('function');
    expect(typeof builder.eq).toBe('function');
    expect(typeof builder.single).toBe('function');
    expect(typeof builder.then).toBe('function');
  });
});

describe('Business-specific Session Controls', () => {
  let user: ReturnType<typeof userEvent.setup>; // Type the user variable
  
  // Mock authenticated user (admin)
  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'authenticated',
    app_metadata: { role: 'admin' }
  };
  
  // Mock organization
  const mockOrganization: Record<string, unknown> = {
    id: 'org-123',
    name: 'Acme Inc',
    domain: 'acme.com',
    sso_enabled: false,
    security_settings: {
      session_timeout_mins: 60, // 1 hour session timeout
      max_sessions_per_user: 3,
      enforce_ip_restrictions: true,
      allowed_ip_ranges: ['192.168.1.0/24', '10.0.0.0/16'],
      enforce_device_restrictions: true,
      allowed_device_types: ['desktop', 'mobile'],
      require_reauth_for_sensitive: true,
      sensitive_actions: ['payment', 'user_management', 'api_keys']
    }
  };
  
  // Mock organization members (currently not used in tests)

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    (globalThis as any).__TEST_ORG__ = mockOrganization;
    // Mock authentication state
    (mockSupabase.auth.getUser as Mock).mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });
    // Remove per-test supabase.from mock implementation for organizations (now handled globally)
    // If needed, keep or add mocks for other tables (e.g., organization_members)
  });

  afterEach(() => {
    delete (globalThis as any).__TEST_ORG__;
    delete (globalThis as any).__TEST_ORG_ERROR__;
    delete (globalThis as any).__LAST_ORGANIZATIONS_BUILDER__; // Clean up the stored builder
  });

  test('Admin can view and configure organization session policies', async () => {
    // Mock successful policy update
    // REMOVED: (supabase.from as vi.Mock).mockReturnValue({ ... });

    // Render organization session manager component
    render(
      <UserManagementProvider>
        <OrganizationProvider orgId="org-123">
          <OrganizationSessionManager orgId="org-123" />
        </OrganizationProvider>
      </UserManagementProvider>
    );
    
    // Wait for component to load with organization data
    await waitFor(() => {
      expect(screen.getByText(/acme inc/i)).toBeInTheDocument();
      expect(screen.getByText(/session policies/i)).toBeInTheDocument();
    });
    
    // Current policy values should be displayed
    expect(screen.getByDisplayValue('60')).toBeInTheDocument(); // Session timeout 60 mins
    expect(screen.getByDisplayValue('3')).toBeInTheDocument(); // Max 3 sessions per user
    
    // Update session timeout policy
    const timeoutInput = screen.getByLabelText(/session timeout/i);
    await act(async () => {
        await user.clear(timeoutInput);
        await user.type(timeoutInput, '30');
    });
    
    // Save settings
    await act(async () => {
        await user.click(screen.getByRole('button', { name: /save/i }));
    });
    
    // Verify update was called with correct data
    await waitFor(() => {
      const lastOrgBuilder = (globalThis as any).__LAST_ORGANIZATIONS_BUILDER__;
      expect(lastOrgBuilder).toBeDefined();
      expect(lastOrgBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          session_timeout_mins: 30
        })
      );
    });
    
    // Success message should be displayed
    expect(screen.getByText(/settings updated/i)).toBeInTheDocument();
  });

  test('Admin can view and terminate user sessions across organization', async () => {
    // Mock successful session termination
    (mockSupabase.rpc as Mock).mockImplementation((procedure: string, params: any) => {
      if (procedure === 'terminate_user_sessions') {
        return Promise.resolve({
          data: { count: params.user_id === 'user-123' ? 2 : 1 },
          error: null
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    // Render organization session manager
    render(
      <UserManagementProvider>
        <OrganizationProvider orgId="org-123">
          <OrganizationSessionManager orgId="org-123" />
        </OrganizationProvider>
      </UserManagementProvider>
    );
    
    // Wait for component to load with member data
    await waitFor(() => {
      expect(screen.getByText(/organization members/i)).toBeInTheDocument();
      expect(screen.getByText(/user@example.com/i)).toBeInTheDocument();
      expect(screen.getByText(/manager@example.com/i)).toBeInTheDocument();
      expect(screen.getByText(/2 active sessions/i)).toBeInTheDocument(); // For user-123
    });
    
    // Click to terminate all sessions for first user
    const terminateButtons = screen.getAllByRole('button', { name: /terminate sessions/i });
    await act(async () => {
        await user.click(terminateButtons[0]); // First user (user-123)
    });
    
    // Confirm termination
    await act(async () => {
        await user.click(screen.getByRole('button', { name: /confirm/i }));
    });
    
    // Verify RPC call was made with correct user ID
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('terminate_user_sessions', {
        user_id: 'user-123'
      });
    });
    
    // Success message should show count of terminated sessions
    expect(screen.getByText(/2 sessions terminated/i)).toBeInTheDocument();
  });

  test('Admin can configure IP restrictions', async () => {
    // Mock successful policy update
    // REMOVED: (supabase.from as vi.Mock).mockReturnValue({ ... });

    // Render organization session manager
    render(
      <UserManagementProvider>
        <OrganizationProvider orgId="org-123">
          <OrganizationSessionManager orgId="org-123" />
        </OrganizationProvider>
      </UserManagementProvider>
    );
    
    // Click on IP restrictions tab
    await act(async () => {
        await user.click(screen.getByRole('tab', { name: /ip restrictions/i }));
    });
    
    // Wait for IP restriction settings to load
    await waitFor(() => {
      expect(screen.getByText(/allowed ip ranges/i)).toBeInTheDocument();
      expect(screen.getByText(/192.168.1.0\/24/i)).toBeInTheDocument();
    });
    
    // Toggle IP restrictions off
    await act(async () => {
        await user.click(screen.getByLabelText(/enforce ip restrictions/i));
    });
    
    // Add a new IP range
    await act(async () => {
        await user.click(screen.getByRole('button', { name: /add ip range/i }));
    });
    await act(async () => {
        await user.type(screen.getByPlaceholderText(/enter ip range/i), '172.16.0.0/16');
    });
    await act(async () => {
        await user.click(screen.getByRole('button', { name: /add/i }));
    });
    
    // Save settings
    await act(async () => {
        await user.click(screen.getByRole('button', { name: /save/i }));
    });
    
    // Verify update was called with correct data
    await waitFor(() => {
      expect(mockSupabase.from('organizations').update).toHaveBeenCalledWith(
        expect.objectContaining({
          enforce_ip_restrictions: false,
          allowed_ip_ranges: ['192.168.1.0/24', '10.0.0.0/16', '172.16.0.0/16']
        })
      );
    });

    // Success message should be displayed
    expect(screen.getByText(/settings updated/i)).toBeInTheDocument();
  });

  test('Admin can configure reauthentication for sensitive actions', async () => {
    // Mock successful policy update
    // REMOVED: (supabase.from as vi.Mock).mockReturnValue({ ... });

    // Render organization session manager
    render(
      <UserManagementProvider>
        <OrganizationProvider orgId="org-123">
          <OrganizationSessionManager orgId="org-123" />
        </OrganizationProvider>
      </UserManagementProvider>
    );
    
    // Click on sensitive actions tab
    await user.click(screen.getByRole('tab', { name: /sensitive actions/i }));
    
    // Wait for sensitive actions settings to load
    await waitFor(() => {
      expect(screen.getByText(/require reauthentication/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/payment/i)).toBeChecked();
      expect(screen.getByLabelText(/user management/i)).toBeChecked();
      expect(screen.getByLabelText(/api keys/i)).toBeChecked();
    });
    
    // Add a custom sensitive action
    await user.click(screen.getByRole('button', { name: /add custom action/i }));
    await user.type(screen.getByPlaceholderText(/action name/i), 'delete_records');
    await user.click(screen.getByRole('button', { name: /add/i }));
    
    // Uncheck an existing action
    await user.click(screen.getByLabelText(/payment/i));
    
    // Save settings
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    // Verify update was called with correct data
    await waitFor(() => {
      expect(mockSupabase.from('organizations').update).toHaveBeenCalledWith(
        expect.objectContaining({
          sensitive_actions: ['user_management', 'api_keys', 'delete_records']
        })
      );
    });
  });

  test('IP restriction enforcement is applied during login', async () => {
    // Mock the current IP address
    const mockIp = '192.168.1.100'; // Within allowed range
    
    // Mock IP verification RPC
    (mockSupabase.rpc as Mock).mockImplementation((procedure: string, _params: any) => {
      if (procedure === 'check_ip_restrictions') {
        // Check if IP is within allowed ranges
        const securitySettings = mockOrganization.security_settings as { allowed_ip_ranges: string[] };
        const allowed = securitySettings.allowed_ip_ranges.some((range: string) => {
          // This is a simplified check for test purposes
          if (range === '192.168.1.0/24') {
            return mockIp.startsWith('192.168.1.');
          }
          return false;
        });
        
        return Promise.resolve({
          data: { allowed },
          error: null
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    // Render IP verification component during login
    render(
      <OrganizationProvider orgId="org-123">
        <OrganizationSessionManager orgId="org-123" />
      </OrganizationProvider>
    );
    
    // Verify IP check was performed
    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('check_ip_restrictions', {
        org_id: 'org-123',
        ip_address: mockIp
      });
    });
    
    // Should pass and allow login
    expect(screen.getByText(/ip verification successful/i)).toBeInTheDocument();
    
    // Now test with unauthorized IP
    vi.clearAllMocks();
    
    // Update mock response for unauthorized IP
    (mockSupabase.rpc as Mock).mockImplementation((procedure: string, _params: any) => {
      if (procedure === 'check_ip_restrictions') {
        return Promise.resolve({
          data: { allowed: false },
          error: null
        });
      }
      return Promise.resolve({ data: null, error: null });
    });
    
    // Re-render with unauthorized IP
    render(
      <OrganizationProvider orgId="org-123">
        <OrganizationSessionManager orgId="org-123" />
      </OrganizationProvider>
    );
    
    // Should block login
    await waitFor(() => {
      expect(screen.getByText(/unauthorized ip address/i)).toBeInTheDocument();
    });
  });

  test('Force reauthentication dialog works correctly for sensitive operations', async () => {
    // Mock successful reauthentication
    (mockSupabase.auth.signInWithPassword as Mock).mockResolvedValueOnce({
      data: { user: mockAdminUser, session: { access_token: 'new-token' } },
      error: null
    });

    // Render reauthentication dialog
    render(
      <UserManagementProvider>
        <OrganizationProvider orgId="org-123">
          <OrganizationSessionManager orgId="org-123" />
        </OrganizationProvider>
      </UserManagementProvider>
    );
    
    // Verify reauthentication dialog is shown
    await waitFor(() => {
      expect(screen.getByText(/this action requires reauthentication/i)).toBeInTheDocument();
    });
    
    // Enter password and submit
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /verify/i }));
    
    // Verify auth was called
    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'password123'
      });
    });
    
    // Success message should be displayed
    expect(screen.getByText(/verification successful/i)).toBeInTheDocument();
  });
});
