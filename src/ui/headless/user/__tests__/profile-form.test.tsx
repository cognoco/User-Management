import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ProfileForm from '../ProfileForm';
import { TestWrapper } from '../../../../tests/utils/test-wrapper';
import { createMockProfileStore } from '../../../../tests/mocks/profile.store.mock';
import { api } from '@/lib/api/axios';
vi.unmock('@/hooks/auth/useAuth');

let mockStore: ReturnType<typeof createMockProfileStore>;
function useProfileStoreMock(selector?: any) {
  const store = mockStore();
  return selector ? selector(store) : store;
}
useProfileStoreMock.getState = () => mockStore.getState();
useProfileStoreMock.setState = (state: any, replace?: boolean) =>
  mockStore.setState(state, replace);
useProfileStoreMock.subscribe = (...args: any[]) => mockStore.subscribe(...args);
useProfileStoreMock.destroy = () => mockStore.destroy();

vi.mock('@/lib/stores/profile.store', () => ({
  useProfileStore: useProfileStoreMock,
}));

describe('Headless ProfileForm Component', () => {
  const mockProfile = {
    id: 'test-id',
    bio: 'Test bio',
    gender: 'Male',
    address: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    postal_code: '12345',
    phone_number: '1234567890',
    website: 'https://example.com',
    is_public: true,
  };

  let mockFetchProfile: any;
  let mockUpdateProfile: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchProfile = vi.fn();
    mockUpdateProfile = vi.fn();
    mockStore = createMockProfileStore(
      { profile: mockProfile },
      { fetchProfile: mockFetchProfile, updateProfile: mockUpdateProfile }
    );
    // Support setState updater functions
    const originalSetState = mockStore.setState;
    mockStore.setState = (partial: any, replace?: boolean) => {
      const value = typeof partial === 'function' ? partial(mockStore.getState()) : partial;
      originalSetState(value, replace);
    };
    (api.put as any).mockResolvedValue({
      data: { is_public: false, message: 'Privacy settings updated' },
    });
  });

  it('renders with children function and provides correct props', async () => {
    const childrenMock = vi.fn().mockReturnValue(<div>Test Child</div>);
    
    render(
<TestWrapper authenticated>
  <ProfileForm>{childrenMock}</ProfileForm>
</TestWrapper>
);

await waitFor(() => {
  expect(childrenMock).toHaveBeenCalled();
  const props = childrenMock.mock.calls.at(-1)![0];
      expect(props.profile).toEqual(mockProfile);
      expect(props.isLoading).toBe(false);
      expect(props.isEditing).toBe(false);
      expect(typeof props.handleEditToggle).toBe('function');
      expect(typeof props.handlePrivacyChange).toBe('function');
      expect(typeof props.onSubmit).toBe('function');
      expect(props.userEmail).toBe('test@example.com');
    });
  });


  it('fetches profile on mount', async () => {
    render(
      <TestWrapper authenticated>

        <ProfileForm>{() => <div>Test</div>}</ProfileForm>
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(mockFetchProfile).toHaveBeenCalledTimes(1);
    });
  });

  it('toggles editing state when handleEditToggle is called', async () => {
    let editingState = false;
    
    render(

      <TestWrapper authenticated>

        <ProfileForm>
          {(props) => {
            editingState = props.isEditing;
            return (
              <button onClick={props.handleEditToggle}>Toggle Edit</button>
            );
          }}
        </ProfileForm>
      </TestWrapper>
    );
    
    expect(editingState).toBe(false);
    
    fireEvent.click(screen.getByText('Toggle Edit'));
    
    await waitFor(() => {
      expect(editingState).toBe(true);
    });
  });

  it('calls updateProfile when onSubmit is called', async () => {
    const formData = {
      bio: 'Updated bio',
      gender: 'Female',
      address: '456 New St',
      city: 'New City',
      state: 'New State',
      country: 'New Country',
      postal_code: '54321',
      phone_number: '0987654321',
      website: 'https://new-example.com',
    };
    
    render(

      <TestWrapper authenticated>

        <ProfileForm>
          {(props) => (
            <button onClick={() => props.onSubmit(formData)}>Submit</button>
          )}
        </ProfileForm>
      </TestWrapper>
    );
    
    fireEvent.click(screen.getByText('Submit'));
    
    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(formData);
    });
  });

  it('calls api.put when handlePrivacyChange is called', async () => {
    render(

      <TestWrapper authenticated>

        <ProfileForm>
          {(props) => (
            <button onClick={() => props.handlePrivacyChange(false)}>
              Change Privacy
            </button>
          )}
        </ProfileForm>
      </TestWrapper>
    );
    
    fireEvent.click(screen.getByText('Change Privacy'));
    
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/api/profile/privacy', { is_public: false });
    });
  });

  it('updates profile state when privacy is changed', async () => {

    render(
      <TestWrapper authenticated>

        <ProfileForm>
          {(props) => (
            <button onClick={() => props.handlePrivacyChange(false)}>
              Change Privacy
            </button>
          )}
        </ProfileForm>
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Change Privacy'));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/api/profile/privacy', { is_public: false });
      expect(mockStore().profile?.is_public).toBe(false);
    });
  });
});
