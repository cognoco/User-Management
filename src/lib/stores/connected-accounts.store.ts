import { create } from 'zustand';
import { api } from '@/lib/api/axios';
import { ConnectedAccount, ConnectedAccountsState } from '@/types/connected-accounts';
import { OAuthProvider } from '@/types/oauth';

export const useConnectedAccountsStore = create<ConnectedAccountsState>((set) => ({
  accounts: [],
  isLoading: false,
  error: null,

  fetchConnectedAccounts: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/connected-accounts');
      set({ accounts: response.data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || error.response?.data?.message || (error instanceof Error ? error.message : 'Failed to fetch connected accounts'),
        isLoading: false,
      });
    }
  },

  connectAccount: async (provider: OAuthProvider) => {
    try {
      set({ isLoading: true, error: null });
      // Get OAuth URL from backend
      const response = await api.get(`/auth/oauth/${provider}/url`);
      
      // Open OAuth popup/redirect
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        response.data.url,
        'OAuth Login',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error('Failed to open OAuth popup');
      }

      // Listen for OAuth callback
      window.addEventListener('message', async (event) => {
        if (event.data.type === 'oauth_callback') {
          try {
            // Exchange code for tokens
            await api.post(`/auth/oauth/${provider}/callback`, {
              code: event.data.code,
              state: event.data.state,
            });
            
            // Refresh connected accounts list
            await useConnectedAccountsStore.getState().fetchConnectedAccounts();
            
            // Close popup
            popup.close();
          } catch (error: any) {
            set({
              error: error.response?.data?.error || error.response?.data?.message || (error instanceof Error ? error.message : 'Failed to complete OAuth flow'),
              isLoading: false,
            });
          }
        }
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || error.response?.data?.message || (error instanceof Error ? error.message : 'Failed to initiate OAuth flow'),
        isLoading: false,
      });
    }
  },

  disconnectAccount: async (accountId: string) => {
    try {
      set({ isLoading: true, error: null });
      await api.delete(`/connected-accounts/${accountId}`);
      
      // Update local state
      set((state: ConnectedAccountsState) => ({
        accounts: state.accounts.filter((account: ConnectedAccount) => account.id !== accountId),
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.error || error.response?.data?.message || (error instanceof Error ? error.message : 'Failed to disconnect account'),
        isLoading: false,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
