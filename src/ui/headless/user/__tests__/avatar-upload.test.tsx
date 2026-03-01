import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import AvatarUpload from '../AvatarUpload';
import { useProfileStore } from '@/lib/stores/profile.store';
import { useUserManagement } from '@/lib/auth/UserManagementProvider';
import { api } from '@/lib/api/axios';

// Mock dependencies
vi.mock('@/lib/stores/profile.store', () => ({
  useProfileStore: vi.fn(),
}));

vi.mock('@/lib/auth/UserManagementProvider', () => ({
  useUserManagement: vi.fn(),
}));

vi.mock('@/lib/api/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/lib/utils/file-upload', () => ({
  isValidImage: vi.fn().mockReturnValue(true),
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  formatFileSize: (size: number) => `${(size / (1024 * 1024)).toFixed(2)} MB`,
  canvasPreview: vi.fn().mockResolvedValue(undefined),
}));

describe('Headless AvatarUpload Component', () => {
  const mockProfile = {
    id: 'test-id',
    avatar_url: 'https://example.com/avatar.jpg',
    full_name: 'Test User',
  };

  const mockPredefinedAvatars = [
    { id: 'avatar1', url: 'https://example.com/avatar1.jpg', name: 'Avatar 1' },
    { id: 'avatar2', url: 'https://example.com/avatar2.jpg', name: 'Avatar 2' },
  ];

  const mockUploadAvatar = vi.fn();
  const mockRemoveAvatar = vi.fn();
  const mockFetchProfile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup useProfileStore mock to return store object
    const store = {
      profile: mockProfile,
      isLoading: false,
      error: null,
      uploadAvatar: mockUploadAvatar,
      removeAvatar: mockRemoveAvatar,
      fetchProfile: mockFetchProfile,
    };
    (useProfileStore as any).mockReturnValue(store);
    (useProfileStore as any).getState = () => store;

    // Setup useUserManagement mock
    (useUserManagement as any).mockReturnValue({
      platform: 'web',
      isNative: false,
    });

    // Setup api mock
    (api.get as any).mockResolvedValue({
      data: {
        avatars: mockPredefinedAvatars,
      },
    });

    (api.post as any).mockResolvedValue({
      data: {
        success: true,
      },
    });

    // Mock global URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders with children function and provides correct props', () => {
    const childrenMock = vi.fn().mockReturnValue(<div>Test Child</div>);
    
    act(() => {
      render(<AvatarUpload>{childrenMock}</AvatarUpload>);
    });
    
    expect(childrenMock).toHaveBeenCalled();
    
    const props = childrenMock.mock.calls[0][0];
    expect(props.profile).toEqual(mockProfile);
    expect(props.isLoading).toBe(false);
    expect(props.isModalOpen).toBe(false);
    expect(typeof props.handleFileChange).toBe('function');
    expect(typeof props.handleCropAndUpload).toBe('function');
    expect(typeof props.handleRemove).toBe('function');
    expect(typeof props.openAvatarModal).toBe('function');
  });

  it('fetches predefined avatars on mount', async () => {
    act(() => {
      render(<AvatarUpload>{() => <div>Test</div>}</AvatarUpload>);
    });
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/profile/avatar');
    });
  });

  it('opens modal when openAvatarModal is called', async () => {
    let modalState = false;
    
    act(() => {
      render(
        <AvatarUpload>
          {(props) => {
            modalState = props.isModalOpen;
            return (
              <button onClick={props.openAvatarModal}>Open Modal</button>
            );
          }}
        </AvatarUpload>
      );
    });
    
    expect(modalState).toBe(false);
    
    fireEvent.click(screen.getByText('Open Modal'));
    
    await waitFor(() => {
      expect(modalState).toBe(true);
    });
  });

  it('calls removeAvatar when handleRemove is called', async () => {
    act(() => {
      render(
        <AvatarUpload>
          {(props) => (
            <button onClick={props.handleRemove}>Remove Avatar</button>
          )}
        </AvatarUpload>
      );
    });
    
    fireEvent.click(screen.getByText('Remove Avatar'));
    
    await waitFor(() => {
      expect(mockRemoveAvatar).toHaveBeenCalled();
    });
  });

  it('selects a predefined avatar when handleSelectPredefinedAvatar is called', async () => {
    let selectedId: string | null = null;
    
    act(() => {
      render(
        <AvatarUpload>
          {(props) => {
            selectedId = props.selectedAvatarId;
            return (
              <button onClick={() => props.handleSelectPredefinedAvatar('avatar1')}>
                Select Avatar
              </button>
            );
          }}
        </AvatarUpload>
      );
    });
    
    expect(selectedId).toBe(null);
    
    fireEvent.click(screen.getByText('Select Avatar'));
    
    await waitFor(() => {
      expect(selectedId).toBe('avatar1');
    });
  });

  it('applies selected avatar when handleApplySelectedAvatar is called', async () => {
    let captured: any = null;

    await act(async () => {
      render(
        <AvatarUpload>
          {(props) => {
            captured = props;
            return <div>Test</div>;
          }}
        </AvatarUpload>
      );
    });

    expect(captured).toBeTruthy();
    await act(async () => {
      captured.handleSelectPredefinedAvatar('avatar1');
    });
    await act(async () => {
      await captured.handleApplySelectedAvatar();
    });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/profile/avatar/apply', {
        avatarId: 'avatar1'
      });
      expect(mockFetchProfile).toHaveBeenCalled();
    });
  });

  it('resets state when closeModalAndReset is called', async () => {
    let modalState = true;
    let imgSrc = 'test-image.jpg';
    
    const mockFileInput = { value: 'test.jpg' };
    
    act(() => {
      render(
        <AvatarUpload>
          {(props) => {
            modalState = props.isModalOpen;
            imgSrc = props.imgSrc;

            // Override the ref to test reset
            props.fileInputRef.current = mockFileInput as any;

            return (
              <button onClick={props.closeModalAndReset}>Close Modal</button>
            );
          }}
        </AvatarUpload>
      );
    });
    
    // Manually set the modal state to open
    modalState = true;
    
    fireEvent.click(screen.getByText('Close Modal'));
    
    await waitFor(() => {
      expect(modalState).toBe(false);
      expect(imgSrc).toBe('');
      expect(mockFileInput.value).toBe('');
    });
  });
});
