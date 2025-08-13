// __tests__/integration/feedback-submission-flow.test.js

import { vi, beforeEach, afterEach } from 'vitest';
import { screen, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedbackForm from '@/ui/styled/common/FeedbackForm';

// Silence act() warnings as they're expected in integration tests
// This is acceptable according to TESTING_ISSUES.md
const originalError = console.error;
beforeEach(() => {
  console.error = (...args) => {
    if (/Warning.*not wrapped in act/.test(args[0])) {
      return;
    }
    originalError(...args);
  };
});

// Restore console.error after tests
afterEach(() => {
  console.error = originalError;
});

// Mock fetch for API calls
const fetchSpy = vi.fn();
global.fetch = fetchSpy;

describe('Feedback Submission Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API response
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
  });

  test('User can submit feedback with category and description', async () => {
    const user = userEvent.setup();
    const onSuccessMock = vi.fn();

    render(<FeedbackForm onSuccess={onSuccessMock} />);

    // Fill out the feedback form
    const typeSelect = screen.getByLabelText(/feedback type/i);
    await user.selectOptions(typeSelect, 'feature');

    const messageInput = screen.getByLabelText(/message/i);
    await user.type(messageInput, 'I would like to see a dark mode option in the application.');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    await user.click(submitButton);

    // Verify that the feedback was submitted correctly
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/feedback', 
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: 'feature',
            message: 'I would like to see a dark mode option in the application.',
            screenshotUrl: null,
          }),
        })
      );
      expect(onSuccessMock).toHaveBeenCalled();
    });

    // Check success message appears
    expect(await screen.findByText(/thank you for your feedback/i)).toBeInTheDocument();
  });

  test('User can attach screenshot to feedback', async () => {
    const user = userEvent.setup();
    
    // Create a proper FileReader mock
    const originalFileReader = window.FileReader;
    
    // Define a simplified FileReader mock with proper typing
    const fileReaderMock = {
      // Define onload only once with proper typing
      onload: null as ((event: any) => void) | null,
      result: null as string | null,
      readyState: 0,
      error: null,
      // Add only necessary methods
      readAsDataURL: vi.fn(function(this: any, _blob: Blob) {
        setTimeout(() => {
          // Set result before calling onload
          this.result = 'data:image/png;base64,c2NyZWVuc2hvdCBkYXRh';
          if (this.onload) {
            const event = { target: { result: this.result } };
            this.onload(event);
          }
        }, 0);
      })
    };
    
    // Override global FileReader with our mock
    window.FileReader = vi.fn(() => fileReaderMock) as any;
    
    render(<FeedbackForm />);

    // Fill out the form with screenshot
    const typeSelect = screen.getByLabelText(/feedback type/i);
    await user.selectOptions(typeSelect, 'bug');

    const messageInput = screen.getByLabelText(/message/i);
    await user.type(messageInput, 'The save button is not working properly.');

    // Create a mock file
    const file = new File(['screenshot data'], 'screenshot.png', { type: 'image/png' });
    const screenshotInput = screen.getByLabelText(/attach screenshot/i);
    await user.upload(screenshotInput, file);

    // Check the preview shows up
    expect(await screen.findByAltText(/screenshot preview/i)).toBeInTheDocument();

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    await user.click(submitButton);

    // Verify the screenshot was uploaded and the feedback was submitted
    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalled();
      expect(insertSpy).toHaveBeenCalledWith([
        expect.objectContaining({
          category: 'bug',
          message: 'The save button is not working properly.',
          screenshotUrl: 'https://example.com/screenshot.png',
        }),
      ]);
    });
    
    // Restore original FileReader
    window.FileReader = originalFileReader;
  });

  test('Form validation prevents empty submissions', async () => {
    const user = userEvent.setup();
    
    render(<FeedbackForm />);

    // Submit without filling anything
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    await user.click(submitButton);

    // Should show validation error for feedback type
    expect(screen.getByText(/please select a feedback type/i)).toBeInTheDocument();

    // Select a type but leave message empty
    const typeSelect = screen.getByLabelText(/feedback type/i);
    await user.selectOptions(typeSelect, 'bug');
    
    // Submit with empty message
    await user.click(submitButton);

    // Now it should show message validation error
    await waitFor(() => {
      expect(screen.getByText(/please enter your feedback/i)).toBeInTheDocument();
    });

    // Verify that insert was not called
    expect(insertSpy).not.toHaveBeenCalled();
  });

  test('User can include contact information for follow-up', async () => {
    const user = userEvent.setup();
    
    render(<FeedbackForm />);

    // Fill out the form
    const typeSelect = screen.getByLabelText(/feedback type/i);
    await user.selectOptions(typeSelect, 'general');

    const messageInput = screen.getByLabelText(/message/i);
    await user.type(messageInput, 'How do I export my data? Please contact me at test@example.com.');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    await user.click(submitButton);
    
    // Verify the feedback with contact info was submitted
    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith([
        expect.objectContaining({
          category: 'general',
          message: 'How do I export my data? Please contact me at test@example.com.',
        }),
      ]);
    });
  });

  test('Anonymous users can submit feedback', async () => {
    const user = userEvent.setup();
    
    render(<FeedbackForm />);

    // Fill out the form
    const typeSelect = screen.getByLabelText(/feedback type/i);
    await user.selectOptions(typeSelect, 'general');

    const messageInput = screen.getByLabelText(/message/i);
    await user.type(messageInput, 'The UI could be more intuitive.');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    await user.click(submitButton);
    
    // Verify anonymous feedback was submitted (no user info)
    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith([
        expect.objectContaining({
          category: 'general',
          message: 'The UI could be more intuitive.',
        }),
      ]);
    });
  });

  test('Handles submission errors gracefully', async () => {
    const user = userEvent.setup();
    const onErrorMock = vi.fn();
    
    // Mock an error response for this test only
    insertSpy.mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'Database error' } 
    });

    render(<FeedbackForm onError={onErrorMock} />);

    // Fill out the form
    const typeSelect = screen.getByLabelText(/feedback type/i);
    await user.selectOptions(typeSelect, 'general');

    const messageInput = screen.getByLabelText(/message/i);
    await user.type(messageInput, 'General comment about the application.');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    await user.click(submitButton);

    // Verify error handling
    await waitFor(() => {
      // Use expect.stringContaining for more flexible assertions with i18n
      expect(onErrorMock).toHaveBeenCalledWith(expect.stringContaining('Database error'));
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage.textContent?.toLowerCase()).toContain('database error');
    });
  });
});
