// __tests__/integration/data-management-flow.test.tsx

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { Dashboard } from '@/ui/styled/dashboard/Dashboard';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import '@/tests/i18nTestSetup'; 

// Create spy functions that we can control
const selectSpy = vi.fn();
const insertSpy = vi.fn();
const updateSpy = vi.fn();
const deleteSpy = vi.fn();
const eqSpy = vi.fn();


// Fix the mocking approach: make update and delete use their spies and return chainable eq
vi.mock('@/lib/database/supabase', () => {
  return {
    supabase: {
      from: vi.fn().mockImplementation(() => {
        return {
          select: selectSpy,
          insert: insertSpy,
          update: updateSpy.mockImplementation(() => ({ eq: eqSpy })),
          delete: deleteSpy.mockImplementation(() => ({ eq: eqSpy })),
        };
      }),
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'user@example.com' } },
          error: null
        })
      }
    }
  };
});

// Import after mock
import { supabase } from '@/lib/database/supabase';

describe('Data Management Flow', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    // Clear all mocks between tests
    vi.clearAllMocks();
    
    // Reset DOM between tests to prevent test bleed
    document.body.innerHTML = '';
    
    user = userEvent.setup();
    
    // Mock empty data list initially
    selectSpy.mockResolvedValue({ 
      data: [], 
      error: null, 
      count: 0, 
      status: 200, 
      statusText: 'OK' 
    });
    
    // Mock insert/update/delete
    insertSpy.mockResolvedValue({ 
      data: null, 
      error: null, 
      count: null, 
      status: 201, 
      statusText: 'Created' 
    });
    
    updateSpy.mockResolvedValue({ 
      data: null, 
      error: null, 
      count: null, 
      status: 200, 
      statusText: 'OK' 
    });
    
    deleteSpy.mockResolvedValue({ 
      data: null,  
      error: null, 
      count: null, 
      status: 204,
      statusText: 'No Content'
    });
    
    eqSpy.mockResolvedValue({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: 'OK'
    });
  });

  test('User can create, view, edit and delete content', async () => {
    // Render component
    await act(async () => {
      render(<Dashboard />);
    });
    
    // Verify initial state
    expect(supabase.from).toHaveBeenCalledWith('items');
    expect(selectSpy).toHaveBeenCalledTimes(1);
    await screen.findByText(/no items found/i);

    // --- CREATE --- 
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /create new/i }));
    });
    
    await act(async () => {
      await user.type(screen.getByLabelText(/title/i), 'Test Item');
    });
    
    await act(async () => {
      await user.type(screen.getByLabelText(/description/i), 'Test Description');
    });

    // Set up mocks for save action
    insertSpy.mockResolvedValueOnce({ 
      data: [{ id: 'item-1', title: 'Test Item', description: 'Test Description' }], 
      error: null 
    });
    
    selectSpy.mockResolvedValueOnce({ 
      data: [{ id: 'item-1', title: 'Test Item', description: 'Test Description' }], 
      error: null 
    });

    // Perform save action
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /save/i }));
    });
    
    // Verify mock calls
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(selectSpy).toHaveBeenCalledTimes(2); // Initial + after create
    
    // Check UI updated correctly
    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });
    expect(screen.queryByText(/no items found/i)).not.toBeInTheDocument();

    // --- EDIT --- 
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /edit/i }));
    });
    
    await act(async () => {
      await user.clear(screen.getByLabelText(/title/i));
    });
    
    await act(async () => {
      await user.type(screen.getByLabelText(/title/i), 'Updated Item');
    });

    // Set up mocks for update
    eqSpy.mockResolvedValueOnce({ 
      data: [{ id: 'item-1', title: 'Updated Item', description: 'Test Description' }], 
      error: null 
    });
    
    selectSpy.mockResolvedValueOnce({ 
      data: [{ id: 'item-1', title: 'Updated Item', description: 'Test Description' }], 
      error: null 
    });

    // Perform update
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /save/i }));
    });

    // Verify mock calls
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(eqSpy).toHaveBeenCalledTimes(1);
    expect(selectSpy).toHaveBeenCalledTimes(3); // Initial + after create + after update
    
    // Check UI updated correctly
    await waitFor(() => {
      expect(screen.getByText('Updated Item')).toBeInTheDocument();
    });
    expect(screen.queryByText('Test Item')).not.toBeInTheDocument();

    // --- DELETE --- 
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    
    // Set up mocks for delete
    eqSpy.mockResolvedValueOnce({ 
      data: [{ id: 'item-1' }], 
      error: null 
    });
    
    selectSpy.mockResolvedValueOnce({ 
      data: [], 
      error: null 
    });

    // Perform deletion
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /delete/i }));
    });

    // Verify mock calls
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(eqSpy).toHaveBeenCalledTimes(2); // update + delete
    expect(selectSpy).toHaveBeenCalledTimes(4); // Initial + after create + after update + after delete
    
    // Check UI updated correctly
    await waitFor(() => {
      expect(screen.getByText(/no items found/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Updated Item')).not.toBeInTheDocument();
  });

  test('handles error when creating item', async () => {
    // Start with empty data for this test
    selectSpy.mockResolvedValue({ 
      data: [], 
      error: null 
    });
    
    await act(async () => {
      render(<Dashboard />);
    });
    
    await screen.findByText(/no items found/i);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /create new/i }));
    });
    
    await act(async () => {
      await user.type(screen.getByLabelText(/title/i), 'Test Item');
    });
    
    await act(async () => {
      await user.type(screen.getByLabelText(/description/i), 'Test Description');
    });

    // Mock error when inserting
    insertSpy.mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'Error creating item' } 
    });

    // Submit form
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /save/i }));
    });

    // Error should be displayed
    await waitFor(() => {
      expect(screen.getByText(/error creating item/i)).toBeInTheDocument();
    });
  });

  test('handles error when updating item', async () => {
    // Initial data with one item - only for this test
    selectSpy.mockResolvedValue({ 
      data: [{ id: 'item-1', title: 'Original Item', description: 'Original Description' }], 
      error: null 
    });

    await act(async () => {
      render(<Dashboard />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Original Item')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /edit/i }));
    });
    
    await act(async () => {
      await user.clear(screen.getByLabelText(/title/i));
    });
    
    await act(async () => {
      await user.type(screen.getByLabelText(/title/i), 'Updated Item');
    });

    // Mock error for update
    eqSpy.mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'Error updating item' } 
    });

    // Submit form
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /save/i }));
    });

    // Error should be displayed
    await waitFor(() => {
      expect(screen.getByText(/error updating item/i)).toBeInTheDocument();
    });
  });

  test('handles error when deleting item', async () => {
    // Initial data with one item - only for this test
    selectSpy.mockResolvedValue({ 
      data: [{ id: 'item-1', title: 'Test Item', description: 'Test Description' }], 
      error: null 
    });

    await act(async () => {
      render(<Dashboard />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    // Set up for delete with error
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    
    eqSpy.mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'Error deleting item' } 
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /delete/i }));
    });

    // Error should be displayed
    await waitFor(() => {
      expect(screen.getByText(/error deleting item/i)).toBeInTheDocument();
    });
  });
});
