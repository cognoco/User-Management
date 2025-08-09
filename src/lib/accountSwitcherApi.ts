// AccountSwitcher API abstraction that talks to backend API routes (no direct Supabase)

// Types
export interface Account {
  id: string;
  name: string;
  type: 'personal' | 'organization';
  avatar_url?: string | null;
}

export interface OrganizationMember {
  id: string;
  name: string;
  role: string;
}

// Fetch all accounts for the current user
export async function fetchAccounts(): Promise<Account[]> {
  const resp = await fetch('/api/accounts');
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error || 'Failed to fetch accounts');
  return json.accounts || [];
}

// Switch to a different account
export async function switchAccount(accountId: string): Promise<void> {
  const resp = await fetch('/api/account/switch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId }),
  });
  if (!resp.ok) {
    const json = await resp.json();
    throw new Error(json.error || 'Switch failed');
  }
}

// Create a new organization
export async function createOrganization(name: string): Promise<Account> {
  const resp = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error || 'Create organization failed');
  return json.organization;
}

// Fetch members of an organization
export async function fetchOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
  const resp = await fetch(`/api/organizations/${orgId}/members`);
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error || 'Failed to list members');
  return json.members || [];
}

// Leave an organization
export async function leaveOrganization(orgId: string): Promise<void> {
  const resp = await fetch(`/api/organizations/${orgId}/leave`, { method: 'POST' });
  if (!resp.ok) {
    const json = await resp.json();
    throw new Error(json.error || 'Leave failed');
  }
} 