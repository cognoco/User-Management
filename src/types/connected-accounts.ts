import { z } from 'zod';
import { OAuthProvider } from '../types/oauth';

export const connectedAccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  provider: z.nativeEnum(OAuthProvider),
  providerAccountId: z.string(),
  providerEmail: z.string().email(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ConnectedAccount = z.infer<typeof connectedAccountSchema>;

export interface ConnectedAccountsState {
  accounts: ConnectedAccount[];
  isLoading: boolean;
  error: string | null;
  fetchConnectedAccounts: () => Promise<void>;
  connectAccount: (provider: OAuthProvider) => Promise<void>;
  disconnectAccount: (accountId: string) => Promise<void>;
  clearError: () => void;
}
