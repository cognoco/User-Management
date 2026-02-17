import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { usePreferencesStore } from '@/lib/stores/preferences.store';
import { api } from '../../api/axios';
import type { UserPreferences } from '@/types/database';

// Mock useAuth so preferences store gets the user ID without React context
vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'test-user-id' } })),
}));
import { useAuth } from '@/lib/hooks/useAuth';

// Mock the api module
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockUserId = 'test-user-id';
const mockPreferences: UserPreferences = {
  id: 'pref-id-123',
  userId: mockUserId,
  language: 'en',
  theme: 'dark',
  notifications: { email: true, push: false, marketing: false },
  itemsPerPage: 25,
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('usePreferencesStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      usePreferencesStore.setState({
        preferences: null,
        isLoading: false,
        error: null,
        _userId: mockUserId,
      });
    });
    // Mock authenticated user by default
    vi.mocked(useAuth).mockReturnValue({ user: { id: mockUserId } } as any);
    // Reset mocks
    vi.clearAllMocks();
    // Re-apply auth mock after clearAllMocks since clearAllMocks resets it
    vi.mocked(useAuth).mockReturnValue({ user: { id: mockUserId } } as any);
    // Re-apply userId to store after clear
    usePreferencesStore.setState({ _userId: mockUserId });
  });

  it('should have correct initial state', () => {
    const { preferences, isLoading, error } = usePreferencesStore.getState();
    expect(preferences).toBeNull();
    expect(isLoading).toBe(false);
    expect(error).toBeNull();
  });

  describe('fetchPreferences', () => {
    it('should fetch preferences and update state on success', async () => {
      (api.get as any).mockResolvedValue({ data: mockPreferences });

      await act(async () => {
        await usePreferencesStore.getState().fetchPreferences();
      });

      const { preferences, isLoading, error } = usePreferencesStore.getState();
      expect(api.get).toHaveBeenCalledWith('/api/preferences');
      expect(isLoading).toBe(false);
      expect(error).toBeNull();
      expect(preferences).toEqual(mockPreferences);
    });

    it('should set error state on fetch failure', async () => {
      const errorMessage = 'Failed to fetch';
      (api.get as any).mockRejectedValue({ response: { data: { error: errorMessage } } });

      await act(async () => {
        await usePreferencesStore.getState().fetchPreferences();
      });

      const { preferences, isLoading, error } = usePreferencesStore.getState();
      expect(api.get).toHaveBeenCalledWith('/api/preferences');
      expect(isLoading).toBe(false);
      expect(error).toBe(errorMessage);
      expect(preferences).toBeNull();
    });

    it('should not fetch if user is not authenticated', async () => {
        vi.mocked(useAuth).mockReturnValue({ user: null } as any); usePreferencesStore.setState({ _userId: undefined }); // No user
        const consoleWarnSpy = vi.spyOn(console, 'warn');

        await act(async () => {
          await usePreferencesStore.getState().fetchPreferences();
        });
        
        expect(api.get).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledWith('Attempted to fetch preferences without authenticated user.');
        expect(usePreferencesStore.getState().isLoading).toBe(false);
        consoleWarnSpy.mockRestore();
    });
  });

  describe('updatePreferences', () => {
    const updatePayload: Partial<UserPreferences> = {
      theme: 'light',
      notifications: { email: false, push: true, marketing: true },
    };
    const updatedPreferences = { ...mockPreferences, ...updatePayload, updatedAt: new Date() };

    beforeEach(() => {
        // Set initial preferences for update tests
        act(() => {
            usePreferencesStore.setState({ preferences: mockPreferences });
        });
    });

    it('should update preferences and state on success', async () => {
      (api.patch as any).mockResolvedValue({ data: updatedPreferences });

      let result;
      await act(async () => {
        result = await usePreferencesStore.getState().updatePreferences(updatePayload);
      });

      const { preferences, isLoading, error } = usePreferencesStore.getState();
      expect(result).toBe(true);
      expect(api.patch).toHaveBeenCalledWith('/api/preferences', updatePayload);
      expect(isLoading).toBe(false);
      expect(error).toBeNull();
      // Check if state was updated (exact match might fail due to date)
      expect(preferences?.theme).toBe(updatedPreferences.theme);
      expect(preferences?.notifications).toEqual(updatedPreferences.notifications);
    });

    it('should prevent updating immutable fields', async () => {
        const invalidUpdatePayload = { 
            ...updatePayload, 
            id: 'new-id', 
            userId: 'new-user-id', 
            createdAt: new Date(0)
        };
        (api.patch as any).mockResolvedValue({ data: updatedPreferences });

        await act(async () => {
            await usePreferencesStore.getState().updatePreferences(invalidUpdatePayload);
        });

        // Check that the PATCH call received data WITHOUT immutable fields
        expect(api.patch).toHaveBeenCalledWith('/api/preferences', updatePayload); 
        expect((api.patch as any).mock.calls[0][1]).not.toHaveProperty('id');
        expect((api.patch as any).mock.calls[0][1]).not.toHaveProperty('userId');
        expect((api.patch as any).mock.calls[0][1]).not.toHaveProperty('createdAt');
    });

    it('should set error state on update failure', async () => {
      const errorMessage = 'Failed to update';
      (api.patch as any).mockRejectedValue({ response: { data: { error: errorMessage } } });

      let result;
      await act(async () => {
        result = await usePreferencesStore.getState().updatePreferences(updatePayload);
      });

      const { preferences, isLoading, error } = usePreferencesStore.getState();
      expect(result).toBe(false);
      expect(api.patch).toHaveBeenCalledWith('/api/preferences', updatePayload);
      expect(isLoading).toBe(false);
      expect(error).toBe(errorMessage);
      // Preferences should remain unchanged from beforeEach setup
      expect(preferences?.theme).toBe(mockPreferences.theme);
    });

    it('should not update if user is not authenticated', async () => {
        vi.mocked(useAuth).mockReturnValue({ user: null } as any); usePreferencesStore.setState({ _userId: undefined }); // No user

        let result;
        await act(async () => {
          result = await usePreferencesStore.getState().updatePreferences(updatePayload);
        });
        
        const { error } = usePreferencesStore.getState();
        expect(result).toBe(false);
        expect(api.patch).not.toHaveBeenCalled();
        expect(error).toBe('User not authenticated to update preferences');
    });
  });
}); 