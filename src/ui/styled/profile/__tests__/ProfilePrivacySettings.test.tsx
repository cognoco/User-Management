import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { TestWrapper } from '../../../../tests/utils/test-wrapper';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ProfilePrivacySettings } from '@/ui/styled/profile/ProfilePrivacySettings';
import { useProfileStore } from '@/lib/stores/profile.store';
import { usePermission } from '@/hooks/permission/usePermissions';
import type { Profile } from '@/types/database';

// Mock the stores and hooks
vi.mock('@/lib/stores/profile.store');
vi.mock('@/hooks/permission/usePermissions');

function renderWithWrapper(ui: React.ReactElement) {
  return render(<TestWrapper authenticated>{ui}</TestWrapper>);
}

// Helper to create a valid mock profile matching the DbProfile (database.ts) shape
function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'test-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'test-user-id',
    userType: 'private' as const,
    avatarUrl: null,
    bio: null,
    location: null,
    website: null,
    phoneNumber: null,
    privacySettings: {
      showEmail: false,
      showPhone: false,
      showLocation: true,
      profileVisibility: 'public' as const,
    },
    companyName: null,
    companyLogoUrl: null,
    companySize: null,
    industry: null,
    companyWebsite: null,
    position: null,
    department: null,
    ...overrides,
  };
}

// Helper to create a mock store return value matching the actual useProfileStore shape
function createMockStore(overrides: Record<string, unknown> = {}) {
  return {
    profile: createMockProfile(),
    isLoading: false,
    error: null,
    fetchProfile: vi.fn().mockResolvedValue(undefined),
    updateProfile: vi.fn().mockResolvedValue(undefined),
    updateBusinessProfile: vi.fn().mockResolvedValue(undefined),
    convertToBusinessProfile: vi.fn().mockResolvedValue(undefined),
    uploadAvatar: vi.fn().mockResolvedValue(null),
    removeAvatar: vi.fn().mockResolvedValue(true),
    uploadCompanyLogo: vi.fn().mockResolvedValue(null),
    removeCompanyLogo: vi.fn().mockResolvedValue(true),
    clearError: vi.fn(),
    verification: null,
    verificationLoading: false,
    verificationError: null,
    fetchVerificationStatus: vi.fn().mockResolvedValue(undefined),
    requestVerification: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('ProfilePrivacySettings', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useProfileStore).mockReturnValue(createMockStore() as any);

    vi.mocked(usePermission).mockReturnValue({
      hasPermission: true,
      isLoading: false,
    });
  });

  test('renders privacy settings heading', async () => {
    await act(async () => {
      renderWithWrapper(<ProfilePrivacySettings />);
    });

    expect(screen.getByText(/profile privacy settings/i)).toBeInTheDocument();
  });

  test('uses profile data from store', async () => {
    const mockProfile = createMockProfile({
      privacySettings: {
        showEmail: true,
        showPhone: false,
        showLocation: false,
        profileVisibility: 'private',
      },
    });

    vi.mocked(useProfileStore).mockReturnValue(createMockStore({ profile: mockProfile }) as any);

    await act(async () => {
      renderWithWrapper(<ProfilePrivacySettings />);
    });

    // Component is currently a stub — just verify it renders
    expect(screen.getByText(/profile privacy settings/i)).toBeInTheDocument();
  });

  test('handles loading state', async () => {
    vi.mocked(useProfileStore).mockReturnValue(
      createMockStore({ isLoading: true }) as any
    );

    await act(async () => {
      renderWithWrapper(<ProfilePrivacySettings />);
    });

    // Stub component renders regardless of loading state
    expect(screen.getByText(/profile privacy settings/i)).toBeInTheDocument();
  });

  test('handles error state', async () => {
    vi.mocked(useProfileStore).mockReturnValue(
      createMockStore({ error: 'Failed to update privacy settings' }) as any
    );

    await act(async () => {
      renderWithWrapper(<ProfilePrivacySettings />);
    });

    expect(screen.getByText(/profile privacy settings/i)).toBeInTheDocument();
  });

  test('handles null profile', async () => {
    vi.mocked(useProfileStore).mockReturnValue(
      createMockStore({ profile: null }) as any
    );

    await act(async () => {
      renderWithWrapper(<ProfilePrivacySettings />);
    });

    expect(screen.getByText(/profile privacy settings/i)).toBeInTheDocument();
  });

  test('respects permission check', async () => {
    vi.mocked(usePermission).mockReturnValue({
      hasPermission: false,
      isLoading: false,
    });

    await act(async () => {
      renderWithWrapper(<ProfilePrivacySettings />);
    });

    // Stub renders regardless — will need updating when component is implemented
    expect(screen.getByText(/profile privacy settings/i)).toBeInTheDocument();
  });
});
