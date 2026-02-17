import React from 'react';
import { render, screen } from '@/tests/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { ProfileForm } from '../ProfileForm';

// Mock dependencies
const fetchProfileMock = vi.fn();
const updateProfileMock = vi.fn();

vi.mock('@/lib/stores/profile.store', () => ({
  useProfileStore: (selector?: (s: any) => any) => {
    // Create a mock store object
    const store = {
      profile: {
        id: '1',
        first_name: 'John',
        last_name: 'Doe',
        bio: 'Old bio',
        email: 'john@example.com',
        is_public: true
      },
      isLoading: false,
      error: null,
      fetchProfile: fetchProfileMock,
      updateProfile: updateProfileMock
    };
    
    // If a selector function is provided, call it with the store
    // Otherwise return the entire store
    return selector ? selector(store) : store;
  },
}));

// Mock the auth hook - this is what we're testing
vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ 
    user: { email: 'user@example.com' },
    isLoading: false
  }),
}));

// Mock the toast component
vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

describe('ProfileForm component', () => {
  it('renders with auth hook data', () => {
    render(<ProfileForm />);
    
    // Verify the component renders with the email from the auth hook
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  it('displays the current user\'s email from the auth hook', () => {
    render(<ProfileForm />);
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });
});
