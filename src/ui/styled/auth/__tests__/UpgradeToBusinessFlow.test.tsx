import { describe, test, expect, beforeEach, vi, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpgradeToBusinessFlow } from '@/ui/styled/auth/UpgradeToBusinessFlow';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/hooks/auth/useAuth';
import { useNotificationStore } from '@/lib/stores/notification-store';

// Mock API calls
vi.mock('@/lib/api', () => ({
  apiRequest: vi.fn()
}));

// Mock auth store
vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn()
}));

// Mock notification store
vi.mock('@/lib/stores/notification-store', () => ({
  useNotificationStore: vi.fn().mockReturnValue({
    showNotification: vi.fn(),
    showError: vi.fn()
  })
}));

describe('UpgradeToBusinessFlow', () => {
  const mockPersonalUser = {
    id: 'user123',
    email: 'personal@example.com',
    firstName: 'John',
    lastName: 'Doe',
    accountType: 'personal',
    isEmailVerified: true
  };
  
  const mockOnCompleted = vi.fn();
  const mockShowNotification = vi.fn();
  const mockShowError = vi.fn();
  
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Setup default mocks
    (useAuth as Mock).mockReturnValue({
      user: mockPersonalUser,
      updateUser: vi.fn()
    });
    
    (useNotificationStore as unknown as Mock).mockReturnValue({
      showNotification: mockShowNotification,
      showError: mockShowError
    });
    
    // Mock successful API responses based on endpoint
    (apiRequest as Mock).mockImplementation((endpoint: string, options?: { method?: string }) => {
      const method = options?.method?.toUpperCase() ?? 'GET';
      if (method === 'POST' && endpoint.includes('upgrade-to-business')) {
        return Promise.resolve({
          data: {
            success: true,
            user: { ...mockPersonalUser, accountType: 'business' }
          }
        });
      }
      // Default: return industries list (GET)
      return Promise.resolve({
        data: { industries: ['Technology', 'Healthcare', 'Finance', 'Education', 'Other'] }
      });
    });
  });

  test('renders upgrade business form with required fields', async () => {
    render(<UpgradeToBusinessFlow onCompleted={mockOnCompleted} />);
    
    // Form title and description
    expect(screen.getByText(/upgrade to business account/i)).toBeInTheDocument();
    expect(screen.getByText(/personal account to a business account/i)).toBeInTheDocument();
    
    // Personal information should be pre-filled
    expect(screen.getByLabelText(/first name/i)).toHaveValue(mockPersonalUser.firstName);
    expect(screen.getByLabelText(/last name/i)).toHaveValue(mockPersonalUser.lastName);
    expect(screen.getByLabelText(/email/i)).toHaveValue(mockPersonalUser.email);
    
    // Business fields should be empty
    expect(screen.getByLabelText(/company name/i)).toHaveValue('');
    
    // Wait for industry dropdown to load options
    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalled();
    });
    
    // Ensure required business fields are present
    expect(screen.getByLabelText(/job title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company size/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/industry/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company website/i)).toBeInTheDocument();
    
    // Required contact fields
    expect(screen.getByLabelText(/state\/province/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business contact email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business phone/i)).toBeInTheDocument();
    
    // Optional fields
    expect(screen.getByLabelText(/vat id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/department/i)).toBeInTheDocument();
    
    // Action buttons
    expect(screen.getByRole('button', { name: /upgrade account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
  
  test('submits upgrade form successfully with valid data', async () => {
    const user = userEvent.setup();
    render(<UpgradeToBusinessFlow onCompleted={mockOnCompleted} />);
    
    // Fill required business fields
    await user.type(screen.getByLabelText(/company name/i), 'Acme Corp');
    await user.type(screen.getByLabelText(/job title/i), 'Software Engineer');
    
    // Select company size from dropdown
    const companySizeDropdown = screen.getByLabelText(/company size/i);
    await user.click(companySizeDropdown);
    await user.click(screen.getByText(/11-50 employees/i));
    
    // Select industry from dropdown
    const industryDropdown = screen.getByLabelText(/industry/i);
    await user.click(industryDropdown);
    await user.click(screen.getByText(/Technology/i));
    
    // Fill in website (optional)
    await user.type(screen.getByLabelText(/company website/i), 'https://acmecorp.com');
    
    // Fill required contact fields
    await user.type(screen.getByLabelText(/state\/province/i), 'California');
    await user.type(screen.getByLabelText(/city/i), 'San Francisco');
    await user.type(screen.getByLabelText(/business contact email/i), 'contact@acmecorp.com');
    await user.type(screen.getByLabelText(/business phone/i), '555-123-4567');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /upgrade account/i }));
    
    // Verify API call with correct data
    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/api/auth/upgrade-to-business', expect.objectContaining({
        userId: mockPersonalUser.id,
        companyName: 'Acme Corp',
        jobTitle: 'Software Engineer',
        companySize: '11-50',
        industry: 'Technology',
        companyWebsite: 'https://acmecorp.com',
        stateProvince: 'California',
        city: 'San Francisco',
        contactEmail: 'contact@acmecorp.com',
        contactPhone: '555-123-4567'
      }));
    });
    
    // Verify success notification and callback
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.stringContaining('successfully upgraded')
    );
    expect(mockOnCompleted).toHaveBeenCalled();
  });
  
  test('shows validation errors for incomplete form submission', async () => {
    const user = userEvent.setup();
    render(<UpgradeToBusinessFlow onCompleted={mockOnCompleted} />);
    
    // Submit without filling required fields
    await user.click(screen.getByRole('button', { name: /upgrade account/i }));
    
    // Check for validation errors
    expect(screen.getByText(/company name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/job title is required/i)).toBeInTheDocument();
    expect(screen.getByText(/company size is required/i)).toBeInTheDocument();
    expect(screen.getByText(/industry is required/i)).toBeInTheDocument();
    expect(screen.getByText(/state\/province is required/i)).toBeInTheDocument();
    expect(screen.getByText(/city is required/i)).toBeInTheDocument();
    expect(screen.getByText(/business contact email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/business phone is required/i)).toBeInTheDocument();
    
    // API should not be called
    expect(apiRequest).not.toHaveBeenCalled();
  });
  
  test('shows invalid format errors for contact fields', async () => {
    const user = userEvent.setup();
    render(<UpgradeToBusinessFlow onCompleted={mockOnCompleted} />);
    
    // Fill required fields with invalid data
    await user.type(screen.getByLabelText(/company name/i), 'Acme Corp');
    await user.type(screen.getByLabelText(/job title/i), 'Software Engineer');
    
    // Select company size from dropdown
    const companySizeDropdown = screen.getByLabelText(/company size/i);
    await user.click(companySizeDropdown);
    await user.click(screen.getByText(/11-50 employees/i));
    
    // Select industry from dropdown
    const industryDropdown = screen.getByLabelText(/industry/i);
    await user.click(industryDropdown);
    await user.click(screen.getByText(/Technology/i));
    
    // Fill in website with invalid format
    await user.type(screen.getByLabelText(/company website/i), 'not-a-valid-url');
    
    // Fill required contact fields with invalid formats
    await user.type(screen.getByLabelText(/state\/province/i), 'California');
    await user.type(screen.getByLabelText(/city/i), 'San Francisco');
    await user.type(screen.getByLabelText(/business contact email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/business phone/i), '123');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /upgrade account/i }));
    
    // Check for format validation errors
    expect(screen.getByText(/enter a valid url/i)).toBeInTheDocument();
    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/enter a valid phone number/i)).toBeInTheDocument();
    
    // API should not be called
    expect(apiRequest).not.toHaveBeenCalled();
  });
  
  test('handles server error during upgrade', async () => {
    // Mock API error
    (apiRequest as Mock).mockRejectedValue({
      response: {
        data: { error: 'Server error occurred during upgrade' }
      }
    });
    
    const user = userEvent.setup();
    render(<UpgradeToBusinessFlow onCompleted={mockOnCompleted} />);
    
    // Fill required business fields
    await user.type(screen.getByLabelText(/company name/i), 'Acme Corp');
    await user.type(screen.getByLabelText(/job title/i), 'Software Engineer');
    
    // Select company size from dropdown
    const companySizeDropdown = screen.getByLabelText(/company size/i);
    await user.click(companySizeDropdown);
    await user.click(screen.getByText(/11-50 employees/i));
    
    // Select industry from dropdown
    const industryDropdown = screen.getByLabelText(/industry/i);
    await user.click(industryDropdown);
    await user.click(screen.getByText(/Technology/i));
    
    // Fill required contact fields
    await user.type(screen.getByLabelText(/state\/province/i), 'California');
    await user.type(screen.getByLabelText(/city/i), 'San Francisco');
    await user.type(screen.getByLabelText(/business contact email/i), 'contact@acmecorp.com');
    await user.type(screen.getByLabelText(/business phone/i), '555-123-4567');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /upgrade account/i }));
    
    // Verify error notification
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        expect.stringContaining('Server error occurred during upgrade')
      );
    });
    
    // Callback should not be called
    expect(mockOnCompleted).not.toHaveBeenCalled();
  });
  
  test('cancels upgrade process when cancel button is clicked', async () => {
    const mockHandleCancel = vi.fn();
    const user = userEvent.setup();
    
    render(<UpgradeToBusinessFlow onCompleted={mockOnCompleted} onCancel={mockHandleCancel} />);
    
    // Click cancel button
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    
    // Verify cancel handler was called
    expect(mockHandleCancel).toHaveBeenCalled();
    
    // API should not be called
    expect(apiRequest).not.toHaveBeenCalled();
  });
  
  test('handles case where user already has a business account', async () => {
    // Mock a user who is already a business user
    (useAuth as Mock).mockReturnValue({
      user: { ...mockPersonalUser, accountType: 'business' },
      updateUser: vi.fn()
    });
    
    const mockHandleCancel = vi.fn();
    render(<UpgradeToBusinessFlow onCompleted={mockOnCompleted} onCancel={mockHandleCancel} />);
    
    // Should show already upgraded message
    expect(screen.getByText(/already have a business account/i)).toBeInTheDocument();
    
    // Should have a button to go back
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    
    // No form fields should be present
    expect(screen.queryByLabelText(/company name/i)).not.toBeInTheDocument();
  });
}); 