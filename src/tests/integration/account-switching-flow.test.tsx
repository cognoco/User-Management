// __tests__/integration/account-switching-flow.test.tsx
import { vi, beforeEach, describe, expect, test, afterEach } from 'vitest';
import '@/tests/i18nTestSetup';
import { setTableMockData } from '@/tests/mocks/supabase';

// IMPORTANT: vi.mock must be at the top, BEFORE any variable declarations
vi.mock('@/lib/database/supabase', async () => await import('../../tests/mocks/supabase'));
// Mock the accountSwitcherApi module
vi.mock('@/lib/accountSwitcherApi', async () => await import('../../tests/mocks/accountSwitcherApi.mock'));

// Type definitions for the Dialog components props
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountSwitcher } from '@/ui/styled/account/AccountSwitcher';
import * as accountSwitcherApi from '@/lib/accountSwitcherApi';

// Mock Data
const mockAccounts = [
  { id: 'personal', name: 'Personal Account', type: 'personal', avatar_url: 'https://example.com/avatar1.jpg' },
  { id: 'work', name: 'Work Account', type: 'organization', avatar_url: 'https://example.com/avatar2.jpg' },
  { id: 'client', name: 'Client Project', type: 'organization', avatar_url: 'https://example.com/avatar3.jpg' }
];

describe('Account Switching Flow', () => {
  const user = userEvent.setup();
  
  // Create a mock for window.location.reload
  const originalWindowLocation = window.location;
  let windowLocationMock: { reload: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    // Set up mock account data
    setTableMockData('accounts', {
      data: mockAccounts,
      error: null
    });
    
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Mock window.location.reload
    windowLocationMock = { reload: vi.fn() };
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: windowLocationMock,
      writable: true
    });
  });

  afterEach(() => {
    // Restore original window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalWindowLocation,
      writable: true
    });
  });

  test('User can view and switch between accounts', async () => {
    render(<AccountSwitcher />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/loading accounts/i)).not.toBeInTheDocument();
    });
    
    // Verify accounts are displayed
    expect(screen.getByText(/Personal Account/i)).toBeInTheDocument();
    expect(screen.getByText(/Work Account/i)).toBeInTheDocument();
    expect(screen.getByText(/Client Project/i)).toBeInTheDocument();

    // Click on the second account
    await user.click(screen.getByText(/Work Account/i));
    
    // Verify switchAccount was called with the correct ID
    expect(accountSwitcherApi.switchAccount).toHaveBeenCalledWith('work');
  });

  test('User can create a new organization account', async () => {
    render(<AccountSwitcher />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/loading accounts/i)).not.toBeInTheDocument();
    });
    
    // Click the "Create Organization" button
    const createOrgButton = screen.getByRole('button', { name: /Create Organization/i });
    await user.click(createOrgButton);
    
    // Wait for dialog to appear and find the input field
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/organization name/i)).toBeInTheDocument();
    });
    
    // Type organization name
    await user.type(screen.getByPlaceholderText(/organization name/i), 'New Test Org');
    
    // Click create button
    const createButton = Array.from(screen.getAllByRole('button')).find(
      button => button.textContent?.toLowerCase().includes('create') && 
      !button.textContent?.toLowerCase().includes('create organization')
    );
    
    expect(createButton).toBeDefined();
    
    await user.click(createButton!);
    
    // Verify createOrganization was called with correct name
    expect(accountSwitcherApi.createOrganization).toHaveBeenCalled();
    
    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/organization created/i)).toBeInTheDocument();
    });
    
    // Verify switchAccount was called with the new organization ID
    expect(accountSwitcherApi.switchAccount).toHaveBeenCalledWith('new-org-123');
    
    // Verify page reload was triggered after successful creation
    expect(windowLocationMock.reload).toHaveBeenCalled();
  });

  test('Displays account-specific information', async () => {
    // Render the component with showDetails prop
    render(<AccountSwitcher showDetails={true} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/loading accounts/i)).not.toBeInTheDocument();
    });
    
    // Now we need to find the details buttons
    // Due to the i18n setup, we can't rely on the exact text "details"
    // Wait for all accounts to be rendered first
    await screen.findByText(/Personal Account/i);
    await screen.findByText(/Work Account/i);
    
    // Find all buttons inside account list items
    const allButtons = screen.getAllByRole('button');
    // Find the "details" button (excluding the "Create Organization" button)
    const detailsButtons = allButtons.filter(button => 
      button.textContent !== 'Create Organization'
    );
    
    // Ensure we have at least two buttons and click the second one (work account)
    expect(detailsButtons.length).toBeGreaterThanOrEqual(2);
    
    // Click the Details button for Work account
    await user.click(detailsButtons[1]);
    
    // Verify fetchOrganizationMembers was called with the correct organization ID
    expect(accountSwitcherApi.fetchOrganizationMembers).toHaveBeenCalledWith('work');
    
    // Look for dialog elements that should appear when dialog is open
    // Dialog should be open with the account details
    await waitFor(() => {
      // Check for content from the dialog
      expect(screen.getByText(/Account Name:/i)).toBeInTheDocument();
    });
    
    // Content should have organization type information
    expect(screen.getByText(/Account Type:/i)).toBeInTheDocument();
    // Check for the members heading
    expect(screen.getByText(/Members/i)).toBeInTheDocument();
  });

  test('User can leave an organization account', async () => {
    render(<AccountSwitcher showDetails={true} />);
    
    // Wait for loading to complete and accounts to be displayed
    await waitFor(() => {
      expect(screen.queryByText(/loading accounts/i)).not.toBeInTheDocument();
    });
    
    // Find all details buttons
    const allButtons = screen.getAllByRole('button');
    const detailsButtons = allButtons.filter(button => 
      button.textContent !== 'Create Organization'
    );
    
    // Click details button for the second item (work organization)
    await user.click(detailsButtons[1]);
    
    // Wait for member details to load and dialog to be visible
    await waitFor(() => {
      expect(accountSwitcherApi.fetchOrganizationMembers).toHaveBeenCalledWith('work');
      expect(screen.getByText(/Account Name:/i)).toBeInTheDocument();
    });
    
    // Click the leave organization button
    const leaveButton = screen.getByRole('button', { name: /leave organization/i });
    await user.click(leaveButton);
    
    // Click confirm on the confirmation dialog
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    
    // Verify leaveOrganization was called correctly
    expect(accountSwitcherApi.leaveOrganization).toHaveBeenCalledWith('work');
    
    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/left organization/i)).toBeInTheDocument();
    });
  });

  test('Handles account switching errors', async () => {
    // Mock API error
    vi.mocked(accountSwitcherApi.switchAccount).mockRejectedValueOnce(new Error('Failed to switch accounts'));
    
    render(<AccountSwitcher />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/loading accounts/i)).not.toBeInTheDocument();
    });
    
    // Click on the second account to trigger error
    await user.click(screen.getByText(/Work Account/i));
    
    // Check that error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/Failed to switch accounts/i)).toBeInTheDocument();
    });
  });
});
