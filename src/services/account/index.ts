export interface Account {
  id: string;
  name: string;
  type: 'personal' | 'organization';
}

class InMemoryAccountService {
  private accounts: Account[] = [];

  listAccounts(userId: string): Account[] {
    // For demo, return existing accounts
    return this.accounts.filter(a => a.id.startsWith(userId));
  }

  createOrganization(name: string, ownerId: string): Account {
    const account: Account = {
      id: `${ownerId}-${Date.now()}`,
      name,
      type: 'organization',
    };
    this.accounts.push(account);
    return account;
  }

  switchAccount(userId: string, accountId: string): void {
    // No-op for demo; would update session context.
  }
}

const service = new InMemoryAccountService();

export function getAccountService() {
  return service;
}
