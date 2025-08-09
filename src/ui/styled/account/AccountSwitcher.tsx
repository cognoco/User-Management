import React, { useEffect, useState } from 'react';
import { fetchAccounts, switchAccount, createOrganization, fetchOrganizationMembers, leaveOrganization, Account, OrganizationMember } from '@/lib/accountSwitcherApi';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/ui/primitives/dialog';
import { Alert } from '@/ui/primitives/alert';

interface AccountSwitcherProps {
  showDetails?: boolean;
}

export const AccountSwitcher: React.FC<AccountSwitcherProps> = ({ showDetails = false }) => {
  const { t } = useTranslation();
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
        setError(err.message || t('error.loadingAccounts'));
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
      setSuccessMsg(t('accountSwitcher.switched', { name: account.name }));
      window.location.reload();
    } catch (err: any) {
      setError(err.message || t('error.switchingAccount'));
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
      setSuccessMsg(t('accountSwitcher.organizationCreated'));
      // Optionally auto-switch to new org
      await switchAccount(newOrg.id);
      window.location.reload();
    } catch (err: any) {
      setOrgError(err.message || t('error.creatingOrganization'));
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
      } catch {
        setMembers([]);
      }
    } else {
      setMembers([]);
    }
  };

  const handleLeaveOrganization = async () => {
    if (!selectedAccount) return;
    setLeaveLoading(true);
    setLeaveError(null);
    try {
      await leaveOrganization(selectedAccount.id);
      setAccounts((prev) => prev.filter((a) => a.id !== selectedAccount.id));
      setShowLeaveDialog(false);
      setSelectedAccount(null);
      setSuccessMsg(t('accountSwitcher.leftOrganization'));
    } catch (err: any) {
      setLeaveError(err.message || t('error.leavingOrganization'));
    } finally {
      setLeaveLoading(false);
    }
  };

  // Ensure accounts is always an array for mapping
  const accountList = Array.isArray(accounts) ? accounts : [];

  return (
    <div>
      {error && <Alert variant="destructive">{error}</Alert>}
      {successMsg && <Alert variant="default">{successMsg}</Alert>}
      {isLoadingAccounts ? (
        <div className="flex items-center justify-center py-8" aria-busy="true">
          <span role="status" aria-live="polite">🔄 {t('accountSwitcher.loading', 'Loading accounts...')}</span>
        </div>
      ) : accountList.length > 0 ? (
        <ul className="space-y-2" aria-busy={isLoadingAccounts}>
          {accountList.map((account) => account && account.id ? (
            <li
              key={account.id}
              className={
                'cursor-pointer p-2 rounded ' +
                (account && currentAccountId && account.id === currentAccountId ? 'bg-primary text-white active-account' : 'bg-muted')
              }
              onClick={() => !switchingAccountId && account && handleSwitch(account)}
              aria-current={account && currentAccountId && account.id === currentAccountId ? 'true' : 'false'}
            >
              <span>{account && account.name}</span>
              {account && account.type === 'organization' && <span className="ml-2 text-xs">({t('accountSwitcher.organization')})</span>}
              {account && switchingAccountId === account.id && (
                <span className="ml-2 animate-spin" role="status" aria-live="polite">🔄</span>
              )}
              {showDetails && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    account && handleShowDetails(account);
                  }}
                  disabled={!!switchingAccountId || isLoadingAccounts}
                >
                  {t('accountSwitcher.details')}
                </Button>
              )}
            </li>
          ) : null)}
        </ul>
      ) : (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          {t('accountSwitcher.noAccounts', 'No accounts found.')}
        </div>
      )}
      <Button className="mt-4" onClick={() => setShowOrgDialog(true)} disabled={isLoadingAccounts || !!switchingAccountId}>
        {t('accountSwitcher.createOrganization')}
      </Button>

      {/* Create Organization Dialog */}
      <Dialog open={showOrgDialog} onOpenChange={setShowOrgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('accountSwitcher.createOrganization')}</DialogTitle>
          </DialogHeader>
          <Input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder={t('accountSwitcher.organizationName')}
            aria-label={t('accountSwitcher.organizationName')}
            disabled={orgLoading}
          />
          {orgError && <Alert variant="destructive">{orgError}</Alert>}
          <DialogFooter>
            <Button onClick={handleCreateOrg} disabled={orgLoading || !orgName}>
              {t('accountSwitcher.create')}
            </Button>
            <Button variant="ghost" onClick={() => setShowOrgDialog(false)}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Details Dialog */}
      <Dialog open={!!selectedAccount && showDetails} onOpenChange={() => setSelectedAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('accountSwitcher.accountDetails')}</DialogTitle>
          </DialogHeader>
          {selectedAccount && (
            <div>
              <div>{t('accountSwitcher.accountName')}: {selectedAccount.name}</div>
              <div>{t('accountSwitcher.accountType')}: {selectedAccount.type}</div>
              {selectedAccount.type === 'organization' && (
                <>
                  <div className="mt-2 font-semibold">{t('accountSwitcher.members')}</div>
                  <ul className="ml-4">
                    {/* Ensure members is always treated as an array */}
                    {Array.isArray(members) && members.length > 0 ? 
                      members.map((m) => (
                        <li key={m.id}>{m.name} ({m.role})</li>
                      )) : 
                      <li>{t('accountSwitcher.noMembers', 'No members found')}</li>
                    }
                  </ul>
                  <Button
                    variant="destructive"
                    className="mt-4"
                    onClick={() => setShowLeaveDialog(true)}
                  >
                    {t('accountSwitcher.leaveOrganization')}
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Leave Organization Confirm Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('accountSwitcher.leaveOrganization')}</DialogTitle>
          </DialogHeader>
          {leaveError && <Alert variant="destructive">{leaveError}</Alert>}
          <div>{t('accountSwitcher.leaveOrganizationConfirm')}</div>
          <DialogFooter>
            <Button variant="destructive" onClick={handleLeaveOrganization} disabled={leaveLoading}>
              {t('common.confirm')}
            </Button>
            <Button variant="ghost" onClick={() => setShowLeaveDialog(false)}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 