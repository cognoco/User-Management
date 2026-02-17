import { create } from 'zustand';
import { api } from '@/lib/api/axios';
import type { UserPreferences } from '@/types/database';
import { useAuth } from '@/lib/hooks/useAuth';

export interface PreferencesState {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (data: Partial<UserPreferences>) => Promise<boolean>;
}

type PreferencesInternalState = PreferencesState & {
  _userId: string | undefined;
  _setUserId: (userId: string | undefined) => void;
};

const preferencesStoreBase = create<PreferencesInternalState>((set, get) => ({
  preferences: null,
  isLoading: false,
  error: null,
  _userId: undefined,
  _setUserId: (userId) => set({ _userId: userId }),

  fetchPreferences: async () => {
    const userId = get()._userId;
    if (!userId) {
      console.warn('Attempted to fetch preferences without authenticated user.');
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/preferences');
      set({ preferences: response.data as UserPreferences, isLoading: false });
    } catch (error: any) {
      console.error('Fetch preferences error:', error);
      set({
        error: error.response?.data?.error || 'Failed to fetch preferences',
        isLoading: false,
      });
    }
  },

  updatePreferences: async (data: Partial<UserPreferences>): Promise<boolean> => {
    const userId = get()._userId;
    if (!userId) {
      set({ error: 'User not authenticated to update preferences' });
      return false;
    }

    // Create updateData by copying payload and deleting immutable fields
    const updateData = { ...data };
    delete updateData.userId;
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    set({ isLoading: true, error: null });
    try {
      const response = await api.patch('/api/preferences', updateData);

      set((state) => ({
        preferences: state.preferences
          ? { ...state.preferences, ...response.data }
          : response.data as UserPreferences,
        isLoading: false
      }));
      return true;
    } catch (error: any) {
      console.error('Update preferences error:', error);
      set({
        error: error.response?.data?.error || 'Failed to update preferences',
        isLoading: false,
      });
      return false;
    }
  },
}));

function _usePreferencesHook(): PreferencesState {
  const store = preferencesStoreBase();
  const { user } = useAuth();

  // Sync userId into the store state so getState() can access it too
  const userId = user?.id;
  if (preferencesStoreBase.getState()._userId !== userId) {
    preferencesStoreBase.setState({ _userId: userId });
  }

  return store;
}

// Export as a combined type: React hook + Zustand store static methods.
// This allows both usePreferencesStore() in components AND usePreferencesStore.getState() in tests.
export const usePreferencesStore = Object.assign(
  _usePreferencesHook,
  preferencesStoreBase
);
