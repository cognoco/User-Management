/**
 * Headless Account Switcher Component
 * 
 * This component handles the behavior of account switching without any UI rendering.
 * It follows the headless UI pattern using render props to allow complete UI customization.
 */

import { useEffect, useState } from 'react';
import { 
  fetchAccounts, 
  switchAccount, 
  createOrganization, 
  fetchOrganizationMembers, 
  leaveOrganization, 
  Account, 
  OrganizationMember 
} from '@/lib/accountSwitcherApi';

export interface AccountSwitcherProps {
  /**
   * Render prop function that receives state and handlers
   */
  render: (props: {
    accounts: Account[];
    currentAccountId: string | null;
    error: string | null;
    successMsg: string | null;
    isLoadingAccounts: boolean;
    switchingAccountId: string | null;
    selectedAccount: Account | null;
    members: OrganizationMember[];
    showOrgDialog: boolean;
    setShowOrgDialog: (show: boolean) => void;
    orgName: string;
    setOrgName: (name: string) => void;
    orgLoading: boolean;
    orgError: string | null;
    showLeaveDialog: boolean;
    setShowLeaveDialog: (show: boolean) => void;
    leaveLoading: boolean;
    leaveError: string | null;
    handleSwitch: (account: Account) => Promise<void>;
    handleCreateOrg: () => Promise<void>;
    handleShowDetails: (account: Account) => Promise<void>;
    handleLeaveOrganization: () => Promise<void>;
    setSelectedAccount: (account: Account | null) => void;
  }) => React.ReactNode;
}

export function AccountSwitcher({ render }: AccountSwitcherProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOrgDialog, setShowOrgDialog] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [switchingAccountId, setSwitchingAccountId] = useState<string | null>(null);

  useEffect(() => {
    const loadAccounts = async () => {
      setIsLoadingAccounts(true);
      try {
        const data = await fetchAccounts();
        setAccounts(Array.isArray(data) ? data : []);
        setCurrentAccountId(Array.isArray(data) && data[0]?.id ? data[0].id : null);
      } catch (err: any) {
        setError(err.message || 'Error loading accounts');
        setAccounts([]); // Defensive: ensure accounts is always an array
      } finally {
        setIsLoadingAccounts(false);
      }
    };
    loadAccounts();
  }, []);

  const handleSwitch = async (account: Account) => {
    setError(null);
    setSuccessMsg(null);
    setSwitchingAccountId(account.id);
    try {
      await switchAccount(account.id);
      setCurrentAccountId(account.id);
      setSuccessMsg(`Switched to ${account.name}`);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Error switching account');
    } finally {
      setSwitchingAccountId(null);
    }
  };

  const handleCreateOrg = async () => {
    setOrgLoading(true);
    setOrgError(null);
    try {
      const newOrg = await createOrganization(orgName);
      setAccounts((prev) => [...prev, newOrg]);
      setShowOrgDialog(false);
      setOrgName('');
      setSuccessMsg('Organization created successfully');
      // Optionally auto-switch to new org
      await switchAccount(newOrg.id);
      window.location.reload();
    } catch (err: any) {
      setOrgError(err.message || 'Error creating organization');
    } finally {
      setOrgLoading(false);
    }
  };

  const handleShowDetails = async (account: Account) => {
    setSelectedAccount(account);
    if (account.type === 'organization') {
      try {
        const orgMembers = await fetchOrganizationMembers(account.id);
        setMembers(Array.isArray(orgMembers) ? orgMembers : []);
      } catch (err: any) {
        setError(err.message || 'Error fetching organization members');
        setMembers([]);
      }
    }
  };

  const handleLeaveOrganization = async () => {
    if (!selectedAccount) return;
    
    setLeaveLoading(true);
    setLeaveError(null);
    try {
      await leaveOrganization(selectedAccount.id);
      setAccounts(accounts.filter(a => a.id !== selectedAccount.id));
      setShowLeaveDialog(false);
      setSelectedAccount(null);
      setSuccessMsg('Left organization successfully');
    } catch (err: any) {
      setLeaveError(err.message || 'Error leaving organization');
    } finally {
      setLeaveLoading(false);
    }
  };

  // Render the component using the render prop
  return render({
    accounts,
    currentAccountId,
    error,
    successMsg,
    isLoadingAccounts,
    switchingAccountId,
    selectedAccount,
    members,
    showOrgDialog,
    setShowOrgDialog,
    orgName,
    setOrgName,
    orgLoading,
    orgError,
    showLeaveDialog,
    setShowLeaveDialog,
    leaveLoading,
    leaveError,
    handleSwitch,
    handleCreateOrg,
    handleShowDetails,
    handleLeaveOrganization,
    setSelectedAccount
  });
}
