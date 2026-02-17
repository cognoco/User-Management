/**
 * Headless Connected Accounts Component
 *
 * Provides account linking state and actions without UI.
 */
import { useEffect } from 'react';
import { useConnectedAccountsStore } from '@/lib/stores/connected-accounts.store';
import type { ConnectedAccount } from '@/types/connected-accounts';
import type { OAuthProvider } from '@/types/oauth';

export interface ConnectedAccountsProps {
  render: (props: {
    accounts: ConnectedAccount[];
    isLoading: boolean;
    error: string | null;
    link: (provider: OAuthProvider) => Promise<void>;
    unlink: (id: string) => Promise<void>;
  }) => React.ReactNode;
}

export function ConnectedAccounts({ render }: ConnectedAccountsProps) {
  const {
    accounts,
    fetchConnectedAccounts,
    connectAccount: linkAccount,
    disconnectAccount: unlinkAccount,
    isLoading,
    error,
  } = useConnectedAccountsStore();

  useEffect(() => { fetchConnectedAccounts(); }, [fetchConnectedAccounts]);

  return (
    <>{render({ accounts, isLoading, error, link: linkAccount, unlink: unlinkAccount })}</>
  );
}
