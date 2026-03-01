// __tests__/integration/error-recovery-flow.test.tsx

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormWithRecovery from '@/ui/styled/common/FormWithRecovery';
import { describe, test, expect, beforeEach, vi } from 'vitest';

describe('Error Recovery Flow', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
  });

  test('Form shows error on failed submit and allows retry', async () => {
    const mockSubmit = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(undefined);

    render(<FormWithRecovery onSubmit={mockSubmit} />);

    // Fill out form
    await act(async () => {
      await user.type(screen.getByLabelText(/name/i), 'Test Name');
    });

    // Submit form — should fail
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /submit/i }));
    });

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/i)).toBeInTheDocument();
    });

    // Verify the form data is still present (not cleared on error)
    expect(screen.getByLabelText(/name/i)).toHaveValue('Test Name');

    // Click retry button (inside the error message)
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /retry/i }));
    });

    // Verify second submit was called
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(2);
      expect(mockSubmit).toHaveBeenLastCalledWith({ name: 'Test Name' });
    });
  });

  test('Form displays custom title', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    render(<FormWithRecovery onSubmit={mockSubmit} title="My Custom Form" />);

    expect(screen.getByText('My Custom Form')).toBeInTheDocument();
  });

  test('Form uses default title when none provided', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    render(<FormWithRecovery onSubmit={mockSubmit} />);

    expect(screen.getByText('Form With Error Recovery')).toBeInTheDocument();
  });

  test('Submit button is disabled while submitting', async () => {
    // Create a promise we control to keep the submit pending
    let resolveSubmit: () => void;
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    const mockSubmit = vi.fn().mockReturnValue(submitPromise);

    render(<FormWithRecovery onSubmit={mockSubmit} />);

    // Fill and submit
    await act(async () => {
      await user.type(screen.getByLabelText(/name/i), 'Test');
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /submit/i }));
    });

    // Button should show "Submitting..." and be disabled
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled();

    // Resolve the submission
    await act(async () => {
      resolveSubmit!();
    });

    // Button should be re-enabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit/i })).not.toBeDisabled();
    });
  });

  test('Form submits data correctly on success', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    render(<FormWithRecovery onSubmit={mockSubmit} />);

    await act(async () => {
      await user.type(screen.getByLabelText(/name/i), 'Alice');
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /submit/i }));
    });

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({ name: 'Alice' });
    });

    // No error should be shown
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  test('Form clears previous error on new successful submit', async () => {
    const mockSubmit = vi.fn()
      .mockRejectedValueOnce(new Error('Server down'))
      .mockResolvedValueOnce(undefined);

    render(<FormWithRecovery onSubmit={mockSubmit} />);

    // Fill and submit — fails
    await act(async () => {
      await user.type(screen.getByLabelText(/name/i), 'Bob');
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /submit/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Error: Server down/i)).toBeInTheDocument();
    });

    // Submit again — succeeds
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /retry/i }));
    });

    await waitFor(() => {
      expect(screen.queryByText(/Error: Server down/i)).not.toBeInTheDocument();
    });
  });

  test('Renders children inside the form', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <FormWithRecovery onSubmit={mockSubmit}>
        <p>Extra content here</p>
      </FormWithRecovery>
    );

    expect(screen.getByText('Extra content here')).toBeInTheDocument();
  });
});
