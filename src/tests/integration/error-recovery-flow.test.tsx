// __tests__/integration/error-recovery-flow.test.tsx

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import FormWithRecovery from '@/ui/styled/common/FormWithRecovery';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import '@/tests/i18nTestSetup';

// Import our standardized mock
vi.mock('@/lib/database/supabase', () => import('@/tests/mocks/supabase'));
import { supabase } from '@/lib/database/supabase';

describe('Error Recovery Flow', () => {
  let user: ReturnType<typeof userEvent.setup>;
  
  // Mock localStorage using vi.fn
  const localStorageMock = (() => {
    let store: { [key: string]: string } = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value.toString();
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
  })();

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    
    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    
    // Mock authentication
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'user@example.com' } },
      error: null
    });
  });

  test('Form recovers data after network error', async () => {
    // Add props expected by placeholder if needed, e.g., onSubmit
    const mockSubmit = vi.fn().mockRejectedValueOnce({ message: 'Network error' });
    render(<FormWithRecovery onSubmit={mockSubmit} />);

    // Fill out form (assuming FormWithRecovery has name input)
    await act(async () => {
      await user.type(screen.getByLabelText(/name/i), 'Test Name');
    });

    // Submit form
    await act(async () => {
      await user.click(screen.getAllByRole('button', { name: /submit/i })[0]);
    });

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/i)).toBeInTheDocument();
    });

    // Simulate page reload - clear mocks
    vi.clearAllMocks();
    mockSubmit.mockClear();

    // Mock localStorage to return saved form data
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
      name: 'Test Name',
      timestamp: Date.now()
    }));

    // Re-render form
    const mockSubmitSuccess = vi.fn().mockResolvedValue(undefined);
    render(<FormWithRecovery onSubmit={mockSubmitSuccess} />);

    // Verify form data is recovered (assuming component implements this)
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue('Test Name');
    });

    // Submit recovered form
    await act(async () => {
      await user.click(screen.getAllByRole('button', { name: /submit/i })[0]);
    });

    // Verify success
    await waitFor(() => {
       expect(mockSubmitSuccess).toHaveBeenCalledWith({ name: 'Test Name' });
    });
  });
  
  test('User can discard recovered data', async () => {
    // Mock localStorage to return saved form data
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
      name: 'Old Title',
      timestamp: Date.now() - 3600000 // 1 hour ago
    }));
    
    // Render form
    render(<FormWithRecovery formId="test-form" />);
    
    // Verify form data is recovered
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue('Old Title');
    });
    
    // Verify recovery message with timestamp is displayed
    await screen.findByText(/we've restored your previous data/i);
    await screen.findByText(/from about 1 hour ago/i);
    
    // Click discard button
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /discard/i }));
    });
    
    // Verify form is cleared
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue('');
    });
    
    // Verify localStorage entry was removed
    expect(localStorage.removeItem).toHaveBeenCalledWith('form_recovery_test-form');
  });
  
  test('Recovery only shows for recent data', async () => {
    // Mock localStorage to return very old form data (3 days old)
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
      name: 'Very Old Title',
      timestamp: Date.now() - (3 * 24 * 60 * 60 * 1000) // 3 days ago
    }));
    
    // Render form
    render(<FormWithRecovery formId="test-form" />);
    
    // Verify form data is NOT recovered (default empty form)
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue('');
    });
    
    // Verify no recovery message is displayed
    expect(screen.queryByText(/we've restored your previous data/i)).not.toBeInTheDocument();
    
    // Verify very old localStorage entry was removed
    expect(localStorage.removeItem).toHaveBeenCalledWith('form_recovery_test-form');
  });
  
  test('Multiple form instances have separate recovery data', async () => {
    // Render two form instances
    const { rerender } = render(<FormWithRecovery formId="form-a" />);
    
    // Fill out first form
    await act(async () => {
      await user.type(screen.getByLabelText(/name/i), 'Form A Title');
    });
    
    // Mock submission error
    supabase.from().insert.mockResolvedValueOnce({
      data: null,
      error: { message: 'Network error', code: 'NETWORK_ERROR' }
    });
    
    // Submit first form
    await act(async () => {
      await user.click(screen.getAllByRole('button', { name: /submit/i })[0]);
    });
    
    // Verify first form data was saved to localStorage
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'form_recovery_form-a',
      expect.stringContaining('Form A Title')
    );
    
    // Render second form
    rerender(<FormWithRecovery formId="form-b" />);
    
    // Fill out second form
    await act(async () => {
      await user.type(screen.getByLabelText(/name/i), 'Form B Title');
    });
    
    // Mock submission error
    supabase.from().insert.mockResolvedValueOnce({
      data: null,
      error: { message: 'Network error', code: 'NETWORK_ERROR' }
    });
    
    // Submit second form
    await act(async () => {
      await user.click(screen.getAllByRole('button', { name: /submit/i })[0]);
    });
    
    // Verify second form data was saved to localStorage under different key
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'form_recovery_form-b',
      expect.stringContaining('Form B Title')
    );
    
    // Verify each form has its own recovery data
    expect(localStorage.setItem).toHaveBeenCalledTimes(2);
  });
});
