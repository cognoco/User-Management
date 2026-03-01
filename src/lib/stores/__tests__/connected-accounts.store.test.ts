import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { useConnectedAccountsStore } from '../connected-accounts.store';
import { api } from '../../api/axios';
import { ConnectedAccount, ConnectedAccountsState } from '@/types/connected-accounts';
import { act } from '@testing-library/react';
import { OAuthProvider } from '@/types/oauth';

// Mock the api module
vi.mock('@/lib/api/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  }
}));

// Mock window methods used in connectAccount (though not testing its core logic here)
const mockPopupClose = vi.fn();
const mockWindowOpen = vi.fn(() => ({ close: mockPopupClose }));
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
Object.defineProperty(window, 'open', { value: mockWindowOpen, writable: true });
Object.defineProperty(window, 'addEventListener', { value: mockAddEventListener, writable: true });
Object.defineProperty(window, 'removeEventListener', { value: mockRemoveEventListener, writable: true });


const mockApiGet = api.get as Mock;
const mockApiDelete = api.delete as Mock;

describe('Connected Accounts Store', () => {
  const initialState: Partial<ConnectedAccountsState> = {
    accounts: [],
    isLoading: false,
    error: null,
  };

  // Sample data
  const account1: ConnectedAccount = { id: 'acc-1', provider: OAuthProvider.GOOGLE, providerEmail: 'g@test.com', userId: 'u1', providerAccountId: 'gid1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const account2: ConnectedAccount = { id: 'acc-2', provider: OAuthProvider.GITHUB, providerEmail: 'gh@test.com', userId: 'u1', providerAccountId: 'ghid1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };

  beforeEach(() => {
    vi.resetAllMocks();
    // Reset the store state before each test
    useConnectedAccountsStore.setState(initialState as ConnectedAccountsState);
  });

  // --- fetchConnectedAccounts Tests ---
  describe('fetchConnectedAccounts', () => {
    it('should set loading state and fetch accounts successfully', async () => {
      const mockAccounts = [account1, account2];
      mockApiGet.mockResolvedValue({ data: mockAccounts });

      await act(async () => {
        await useConnectedAccountsStore.getState().fetchConnectedAccounts();
      });

      const state = useConnectedAccountsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.accounts).toEqual(mockAccounts);
      expect(state.error).toBeNull();
      expect(mockApiGet).toHaveBeenCalledWith('/connected-accounts');
    });

    it('should set error state if fetching accounts fails', async () => {
      const errorMsg = 'Network Error';
      mockApiGet.mockRejectedValue({ message: errorMsg });

      await act(async () => {
        await useConnectedAccountsStore.getState().fetchConnectedAccounts();
      });

      const state = useConnectedAccountsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.accounts).toEqual([]);
      expect(state.error).toBe('Failed to fetch connected accounts');
    });
  });

  // --- disconnectAccount Tests ---
  describe('disconnectAccount', () => {
    beforeEach(() => {
      // Set initial state with accounts
      useConnectedAccountsStore.setState({ accounts: [account1, account2] } as ConnectedAccountsState);
    });

    it('should set loading state, call delete API, and remove account from state on success', async () => {
      mockApiDelete.mockResolvedValue({}); // Simulate successful delete
      const accountIdToDisconnect = account1.id;

      await act(async () => {
        await useConnectedAccountsStore.getState().disconnectAccount(accountIdToDisconnect);
      });

      const state = useConnectedAccountsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.accounts).toEqual([account2]); // Only account2 should remain
      expect(state.error).toBeNull();
      expect(mockApiDelete).toHaveBeenCalledWith(`/connected-accounts/${accountIdToDisconnect}`);
    });

    it('should set error state if deleting account fails', async () => {
      const errorMsg = 'Delete Failed';
      mockApiDelete.mockRejectedValue({ message: errorMsg });
      const accountIdToDisconnect = account1.id;

      await act(async () => {
        await useConnectedAccountsStore.getState().disconnectAccount(accountIdToDisconnect);
      });

      const state = useConnectedAccountsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.accounts).toEqual([account1, account2]); // Accounts should not change
      expect(state.error).toBe('Failed to disconnect account');
      expect(mockApiDelete).toHaveBeenCalledWith(`/connected-accounts/${accountIdToDisconnect}`);
    });
  });

  // --- connectAccount Tests (Basic) ---
  // Testing the full flow is hard due to window interactions
  describe('connectAccount (basic checks)', () => {
    it('should set loading state and attempt to get OAuth URL', async () => {
      const provider = OAuthProvider.GOOGLE;
      mockApiGet.mockResolvedValue({ data: { url: 'http://mock-oauth-url.com' } });

      // Call connectAccount but do NOT await, so we can check isLoading synchronously
      useConnectedAccountsStore.getState().connectAccount(provider);

      // Immediately check loading state
      expect(useConnectedAccountsStore.getState().isLoading).toBe(true);
      expect(mockApiGet).toHaveBeenCalledWith(`/auth/oauth/${provider}/url`);
      // Cannot easily test window.open or the listener logic here
      
      // Reset loading state manually for subsequent tests if needed, or ensure isolation
      act(() => { useConnectedAccountsStore.setState({ isLoading: false }); }); 
    });

     it('should set error state if getting OAuth URL fails', async () => {
      const provider = OAuthProvider.GOOGLE;
      const errorMsg = 'Failed to get URL';
      mockApiGet.mockRejectedValue({ message: errorMsg });

      await act(async () => {
        await useConnectedAccountsStore.getState().connectAccount(provider);
      });

      const state = useConnectedAccountsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Failed to initiate OAuth flow');
    });

     it('should set error state if window.open fails', async () => {
      const provider = OAuthProvider.GOOGLE;
      mockApiGet.mockResolvedValue({ data: { url: 'http://mock-oauth-url.com' } });
      // Simulate popup blocker or failure to open
      Object.defineProperty(window, 'open', { 
          value: vi.fn(() => null), 
          writable: true 
      }); 

      await act(async () => {
        await useConnectedAccountsStore.getState().connectAccount(provider);
      });

      const state = useConnectedAccountsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Failed to open OAuth popup');
      
      // Restore original mock for other tests
      Object.defineProperty(window, 'open', { value: mockWindowOpen, writable: true }); 
    });
  });

  // --- clearError Tests ---
  describe('clearError', () => {
    it('should set the error state to null', () => {
      act(() => { useConnectedAccountsStore.setState({ error: 'Some Error' }); });
      expect(useConnectedAccountsStore.getState().error).toBe('Some Error');

      act(() => { useConnectedAccountsStore.getState().clearError(); });
      expect(useConnectedAccountsStore.getState().error).toBeNull();
    });
  });
}); 