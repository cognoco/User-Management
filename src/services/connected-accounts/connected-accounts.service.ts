import { prisma } from '@/lib/database/prisma';

export interface ConnectedAccountDTO {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  providerEmail: string;
  createdAt: string;
  updatedAt: string;
}

function mapToDTO(row: any): ConnectedAccountDTO {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    providerAccountId: row.provider_account_id,
    providerEmail: row.provider_email,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class ConnectedAccountsService {
  async listByUser(userId: string): Promise<ConnectedAccountDTO[]> {
    const accounts = await prisma.account.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' },
    });
    return accounts.map(mapToDTO);
  }

  async deleteByIdForUser(accountId: string, userId: string): Promise<boolean> {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account || account.user_id !== userId) {
      return false;
    }
    await prisma.account.delete({ where: { id: accountId } });
    return true;
  }
}

export const connectedAccountsService = new ConnectedAccountsService();
