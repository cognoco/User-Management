import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ProfileTypeConversion } from '../ProfileTypeConversion';
import { useProfileStore } from '@/lib/stores/profile.store';
import { vi } from 'vitest'; // Ensure vi is imported
import * as configModule from '@/lib/config';
import { api } from '@/lib/api/axios';

// --- Mocking Setup ---
const mockToastFn = vi.fn();

vi.mock('@/lib/stores/profile.store');
vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToastFn }),
}));

// Restore Select mock that reads ID from Trigger child
vi.mock('@/ui/primitives/select', async (importOriginal) => {
  // Explicitly type the original module import
  const actual = await importOriginal<typeof import('@/ui/primitives/select')>();
  // Import React inside factory for type checking
  const React = await import('react'); 

  return {
    ...actual, // Keep actual exports like SelectItem
    Select: ({ children, onValueChange, defaultValue, disabled }: any) => {
      let triggerId: string | undefined = undefined;
      let placeholder: string | undefined = "Select...";
      let options: React.ReactNode[] = [];

      // Iterate through children safely
      React.Children.forEach(children, (child) => {
        // Type guard for React elements
        if (!React.isValidElement(child)) return;

        // Find Trigger and get ID
        if (child.type === actual.SelectTrigger) {
          // Assuming props exist if it's a valid element of this type
          const triggerProps = child.props as { id?: string, children?: React.ReactNode };
          triggerId = triggerProps.id;
          
          // Find SelectValue within Trigger for placeholder
          if (triggerProps.children) {
              React.Children.forEach(triggerProps.children, (grandChild) => {
                  if (React.isValidElement(grandChild) && grandChild.type === actual.SelectValue) {
                      const valueProps = grandChild.props as { placeholder?: string };
                      placeholder = valueProps.placeholder || placeholder;
                  }
              });
          }
        }

        // Find Content and map Items to Options
        if (child.type === actual.SelectContent) {
          const contentProps = child.props as { children?: React.ReactNode };
          if (contentProps.children) {
            // Add non-null assertion
            const mapped = React.Children.map(contentProps.children!, (item) => {
                  if (React.isValidElement(item) && item.type === actual.SelectItem) {
                      const itemProps = item.props as { value: any, children?: React.ReactNode };
                      return (
                          <option key={itemProps.value} value={itemProps.value}>
                              {itemProps.children}
                          </option>
                      );
                  }
                  return null;
              });
          options = (mapped ?? []).filter(Boolean) as React.ReactNode[];
          }
        }
      });

      // Render native select with extracted ID and options
      return (
        <select
          id={triggerId} // Use extracted ID
          name={triggerId}
          data-testid={`select-${triggerId}`}
          defaultValue={defaultValue}
          onChange={(e) => onValueChange?.(e.target.value)}
          disabled={disabled}
        >
          <option value="" disabled hidden>{placeholder}</option>
          {options}
        </select>
      );
    },
  };
});
// --- End Mocking Setup ---

// --- MSW Setup ---
const handlers = [
  // Catch-all handler for all requests for debugging
  http.all('*', async ({ request }) => {
    const url = request.url;
    const method = request.method;
    const body = await request.text();
    console.warn(`[MSW][CATCH-ALL] ${method} ${url} | body: ${body}`);
    return HttpResponse.json({ message: 'CATCH-ALL HANDLER', url, method, body });
  }),
  // Add handler for the GET request made by fetchProfile
  http.get('/api/profile/business', ({ request }) => {
    console.log('[MSW] Intercepted GET', request.url);
    return HttpResponse.json({
      id: 'test-id',
      userType: 'private',
      name: 'Test User',
      email: 'test@example.com'
    });
  }),
];
const server = setupServer(...handlers);
beforeAll(() => {
  // Override baseUrl for all tests
  configModule.apiConfig.baseUrl = '';
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
// --- End MSW Setup ---

describe('ProfileTypeConversion', () => {
  const user = userEvent.setup();
  let mockUpdateProfile: ReturnType<typeof vi.fn>;
  let mockToast: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock profile store
    mockUpdateProfile = vi.fn().mockResolvedValue({});
    vi.mocked(useProfileStore).mockReturnValue({
      profile: { id: 'test-id', userType: 'private', name: 'Test User', email: 'test@example.com' } as any,
      isLoading: false,
      error: null,
      updateProfile: mockUpdateProfile,
      fetchProfile: vi.fn(),
      updateBusinessProfile: vi.fn(),
      uploadAvatar: vi.fn(),
      removeAvatar: vi.fn(),
      uploadCompanyLogo: vi.fn(),
      removeCompanyLogo: vi.fn(),
      clearError: vi.fn(),
      convertToBusinessProfile: vi.fn(),
      verification: null,
      verificationLoading: false,
      verificationError: null,
      fetchVerificationStatus: vi.fn(),
      requestVerification: vi.fn(),
    });

    mockToast = mockToastFn;

    // Mock api.post for domain validation and business creation
    vi.spyOn(api, 'post').mockImplementation((url, _data) => {
      if (url === '/api/business/validate-domain') {
        return Promise.resolve({ data: { isValid: true } });
      }
      if (url === '/api/business/create') {
        return Promise.resolve({ data: { id: 'new-business-id' } });
      }
      // fallback for other endpoints
      return Promise.resolve({ data: {} });
    });

    // Log all requests for debugging
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'POST') {
        console.warn(`[MSW][request:start] ${request.method} ${request.url}`);
      }
    });
  });

  // Restore fillForm with selectOptions
  const fillForm = async () => {
    await user.type(screen.getByLabelText(/company name/i), 'Test Company');
    // IMPORTANT: The mock requires the component to pass id/name to <Select> matching the label
    // We need to ensure ProfileTypeConversion.tsx passes id="companySize" and id="industry" to the <Select> components
    // If the component was fixed (id removed from Select), this getByLabelText might fail again.
    // Let's assume for now the component passes the ID to the mock correctly.
    await user.selectOptions(screen.getByLabelText(/company size/i), '11-50');
    await user.selectOptions(screen.getByLabelText(/industry/i), 'Technology');
    await user.type(screen.getByLabelText(/business email domain/i), 'example.com');
  };

  test('renders conversion form for personal profile', async () => {
    await act(async () => { // Wrap render
      render(<ProfileTypeConversion />);
    });
    expect(screen.getByRole('heading', { name: /convert to business account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company size/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/industry/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business email domain/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /convert profile/i })).toBeEnabled();
  });

  test('successfully validates domain, creates business, and updates profile', async () => {
    // Reset handlers specifically for this test override
    server.resetHandlers(); 
    server.use(
      http.post('/api/business/validate-domain', () => {
        return HttpResponse.json({ isValid: true });
      }),
      http.post('/api/business/create', async ({ request }) => {
        const body = await request.json();
        // Ensure the ID is explicitly returned
        return HttpResponse.json({ id: 'new-business-id', name: (body as any)?.name || 'Test Biz' }); 
      })
    );
    await act(async () => {
      render(<ProfileTypeConversion />);
    });
    await act(async () => {
      await fillForm();
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /convert profile/i }));
    });
    
    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ userType: 'corporate', businessId: 'new-business-id' });
    });
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Conversion Successful' }));
    });
  });

  test('shows error and stops if domain validation fails', async () => {
    // Override api.post for this test to simulate domain validation failure
    vi.spyOn(api, 'post').mockImplementation((url, _data) => {
      if (url === '/api/business/validate-domain') {
        return Promise.resolve({ data: { isValid: false } });
      }
      if (url === '/api/business/create') {
        return Promise.resolve({ data: { id: 'new-business-id' } });
      }
      return Promise.resolve({ data: {} });
    });
    await act(async () => {
      render(<ProfileTypeConversion />);
    });
    await act(async () => {
       await fillForm();
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /convert profile/i }));
    });

    // Assert that updateProfile was NOT called, implying create was skipped
    await waitFor(() => {
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });
    // Assert the correct toast was shown
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Validation Failed', description: 'Business domain is not valid or already taken.' }));
    });
    // Assert button is re-enabled
    expect(screen.getByRole('button', { name: /convert profile/i })).toBeEnabled();
  });

  test('shows error if business creation fails', async () => {
    // Override api.post for this test to simulate business creation failure
    vi.spyOn(api, 'post').mockImplementation((url, _data) => {
      if (url === '/api/business/validate-domain') {
        return Promise.resolve({ data: { isValid: true } });
      }
      if (url === '/api/business/create') {
        // Simulate a server error during creation
        const error: any = new Error('Creation failed on server');
        error.response = { status: 500, data: { error: 'Creation failed on server' } };
        return Promise.reject(error);
      }
      return Promise.resolve({ data: {} });
    });
    await act(async () => {
      render(<ProfileTypeConversion />);
    });
    await act(async () => {
      await fillForm();
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /convert profile/i }));
    });

    // Assert update profile was not called
    await waitFor(() => {
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });
    // Assert correct error toast
    await waitFor(() => {
      // Expect the specific error from the mock
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Conversion Failed', description: 'Creation failed on server' }));
    });
  });

  test('shows error if profile update fails', async () => {
    // Reset handlers specifically for this test override
    server.resetHandlers();
    server.use(
      http.post('/api/business/validate-domain', () => {
        return HttpResponse.json({ isValid: true });
      }),
      http.post('/api/business/create', async ({ request }) => {
        const body = await request.json();
        // Ensure the ID is explicitly returned
        return HttpResponse.json({ id: 'new-business-id', name: (body as any)?.name || 'Test Biz' }); 
      })
    );
    mockUpdateProfile.mockRejectedValueOnce(new Error('Store update failed'));
    await act(async () => {
      render(<ProfileTypeConversion />);
    });
    await act(async () => {
      await fillForm();
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /convert profile/i }));
    });

    // Assert update profile was called (even though it rejects)
    await waitFor(() => {
       expect(mockUpdateProfile).toHaveBeenCalled();
    });
    // Assert correct error toast from the rejection
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Conversion Failed', description: 'Store update failed' }));
    });
  });

  // Test loading state - keep waitFor wrapper
  test('shows loading state during conversion', async () => {
    // Reset handlers specifically for this test override
    server.resetHandlers();
    server.use(
      http.post('/api/business/validate-domain', async () => {
        console.log('[MSW] Intercepted delayed validation POST'); // Debug log
        await new Promise(res => setTimeout(res, 50)); 
        return HttpResponse.json({ isValid: true });
      })
    );
    mockUpdateProfile.mockImplementationOnce(async () => {
        await new Promise(res => setTimeout(res, 50));
        return {};
    });
    await act(async () => { // Wrap render
      render(<ProfileTypeConversion />);
    });
    await fillForm();
    const submitButton = screen.getByRole('button', { name: /convert profile/i });
    user.click(submitButton); // Don't await click itself

    await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(submitButton).toHaveTextContent(/converting.../i);
    });

    await waitFor(() => {
        expect(submitButton).toBeEnabled();
        expect(submitButton).toHaveTextContent(/convert profile/i);
    }, { timeout: 2000 });
  });
}); 