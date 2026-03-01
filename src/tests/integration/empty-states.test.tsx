// __tests__/integration/empty-states.test.js

vi.mock('@/lib/database/supabase', () => import('@/tests/mocks/supabase'));
import { supabase } from '@/lib/database/supabase';

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from '@/ui/styled/common/DataTable';
import { SearchResults } from '@/ui/styled/common/SearchResults';
import NotificationCenter from '@/ui/styled/common/NotificationCenter';
import { vi } from 'vitest';

describe('Empty States', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
  });

  test('shows appropriate empty state for data table', async () => {
    // Render data table with empty data and columns
    render(<DataTable data={[]} columns={[]} />);
    
    // Verify empty state is displayed
    await waitFor(async () => {
      await screen.findByText(/no projects found/i);
      await screen.findByText(/create your first project/i);
    });
    
    // Verify create button is displayed
    expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument();
    
    // Verify illustration is displayed
    expect(screen.getByTestId('empty-state-illustration')).toBeInTheDocument();
  });
  
  test('empty state is responsive and looks good on mobile', async () => {
    // Mock empty data response
    const projectsBuilder = supabase.from('projects') as any;
    projectsBuilder.select.mockResolvedValueOnce({
      data: [],
      error: null
    });
    
    // Set viewport to mobile size
    global.innerWidth = 375;
    global.dispatchEvent(new Event('resize'));
    
    // Render data table
    render(<DataTable data={[]} columns={[]} />);
    
    // Verify empty state is displayed
    await waitFor(async () => {
      await screen.findByText(/no projects found/i);
    });
    
    // Verify illustration is present but compact
    const illustration = screen.getByTestId('empty-state-illustration');
    expect(illustration).toBeInTheDocument();
    expect(illustration).toHaveClass('compact');
    
    // Restore viewport size
    global.innerWidth = 1024;
    global.dispatchEvent(new Event('resize'));
  });
  
  test('shows appropriate empty state for search results', async () => {
    // Render search results with query
    render(<SearchResults query="nonexistent term" />);
    
    // Verify empty search results state is displayed
    await waitFor(async () => {
      await screen.findByText(/no results found/i);
      await screen.findByText(/try different keywords/i);
    });
    
    // Verify suggested actions are displayed
    await screen.findByText(/search tips/i);
    
    // Mock search with different query
    const searchBuilder = supabase.from('search') as any;
    searchBuilder.select.mockResolvedValueOnce({
      data: [{ id: 'result-1', title: 'Search Result' }],
      error: null
    });
    
    // Change search query
    await user.type(screen.getByRole('searchbox'), '{selectall}different term');
    await user.keyboard('{Enter}');
    
    // Verify results are displayed instead of empty state
    await waitFor(async () => {
      await screen.findByText('Search Result');
      expect(screen.queryByText(/no results found/i)).not.toBeInTheDocument();
    });
  });
  
  test('shows appropriate empty state for notification center', async () => {
    // Render notification center
    render(<NotificationCenter />);
    
    // Verify empty notifications state is displayed
    await waitFor(async () => {
      await screen.findByText(/no notifications/i);
      await screen.findByText(/you're all caught up/i);
    });
    
    // Verify call-to-action if applicable
    await screen.findByText(/update notification settings/i);
    
    // Fix mockCallbacks.notification to be a function
    const mockCallbacks = { notification: vi.fn() } as Record<string, any>;
    
    // Mock new notification arriving
    const notificationMock = {
      on: vi.fn(),
      subscribe: vi.fn()
    };
    supabase.channel = vi.fn().mockReturnValue(notificationMock);
    
    // Get the callback
    notificationMock.on.mockImplementation((event, callback) => {
      mockCallbacks[event] = callback;
      return notificationMock;
    });
    
    // Trigger a new notification
    if (typeof mockCallbacks.notification === 'function') {
      mockCallbacks.notification({
        new: { 
          id: 'notif-1', 
          title: 'New notification', 
          created_at: new Date().toISOString() 
        }
      });
    }
    
    // Verify empty state is replaced with notification
    await waitFor(async () => {
      await screen.findByText('New notification');
      expect(screen.queryByText(/no notifications/i)).not.toBeInTheDocument();
    });
  });
  
  test('empty state provides guidance based on user role', async () => {
    // Render data table with empty data and columns for admin
    render(<DataTable data={[]} columns={[]} />);
    
    // Verify admin-specific empty state content
    await waitFor(async () => {
      await screen.findByText(/no users found/i);
      await screen.findByText(/invite users/i);
    });
    
    // Verify admin action button
    expect(screen.getByRole('button', { name: /invite users/i })).toBeInTheDocument();
    
    // Now test as regular user
    // Re-render for regular user
    render(<DataTable data={[]} columns={[]} />);
    
    // Verify user-specific empty state content
    await waitFor(async () => {
      await screen.findByText(/no users found/i);
      // Different message for regular users
      await screen.findByText(/contact your administrator/i);
    });
  });
  
  test('handles loading state before showing empty state', async () => {
    // Create a promise that won't resolve immediately
    let resolvePromise: ((value: unknown) => void) | undefined;
    const pendingPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    
    // Mock slow-loading empty data
    const projectsBuilder = supabase.from('projects') as any;
    projectsBuilder.select.mockReturnValueOnce(pendingPromise);
    
    // Render component
    render(<DataTable data={[]} columns={[]} />);
    
    // Check loading state is displayed
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.queryByText(/no projects found/i)).not.toBeInTheDocument();
    
    // Resolve the promise with empty data
    resolvePromise!({
      data: [],
      error: null
    });
    
    // Verify loading is replaced by empty state
    await waitFor(async () => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      await screen.findByText(/no projects found/i);
    });
  });
});
