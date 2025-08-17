import React, { useEffect, useState } from 'react';
import { useOrganizationPolicies, useOrganizationMembers, useTerminateUserSessions } from '@/hooks/user/useOrganizationSession';
import { useOrganization } from '@/lib/context/OrganizationContext';
import { OrganizationSecurityPolicy } from '@/types/organizations';

interface OrganizationSessionManagerProps {
  orgId: string;
}

export const OrganizationSessionManager: React.FC<OrganizationSessionManagerProps> = ({ orgId }): JSX.Element => {
  const { organization } = useOrganization();
  const orgName = organization?.name || 'Organization';

  // Policies
  const { policies, loading: policiesLoading, error: policiesError, fetchPolicies, updatePolicies } = useOrganizationPolicies(orgId);
  const [editPolicies, setEditPolicies] = useState<OrganizationSecurityPolicy | null>(null);
  // Members
  const { members, loading: membersLoading, error: membersError, refetch: refetchMembers } = useOrganizationMembers(orgId);
  // Terminate Sessions
  const { terminateUserSessions, loading: terminateLoading, error: terminateError, count } = useTerminateUserSessions(orgId);

  const [activeTab, setActiveTab] = useState<'policies' | 'password' | 'ip' | 'sensitive' | 'mfa'>('policies');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      // Cleanup on unmount
    };
  }, []);

  // Sync editPolicies with fetched policies
  useEffect(() => {
    if (policies) setEditPolicies({ ...policies });
  }, [policies]);

  // Fetch on mount
  useEffect(() => {
    fetchPolicies();
    refetchMembers();
  }, [fetchPolicies, refetchMembers]);

  React.useEffect(() => {
    // Handle activeTab changes
  }, [activeTab]);

  const handleSavePolicies = async (): Promise<void> => {
    if (!editPolicies) return;
    await updatePolicies(editPolicies);
    setSuccessMessage('Settings updated');
    setTimeout(() => setSuccessMessage(null), 2000);
    fetchPolicies();
  };

  const handleTerminateSessions = async (userId: string): Promise<void> => {
    await terminateUserSessions(userId);
    setSuccessMessage(`${count || 0} sessions terminated`);
    setPendingUserId(null);
    setTimeout(() => setSuccessMessage(null), 2000);
    refetchMembers();
  };

  if (policiesLoading || membersLoading) return <div className="p-4">Loading...</div>;
  if (policiesError) return <div className="p-4 text-red-600">{policiesError}</div>;
  if (membersError) return <div className="p-4 text-red-600">{membersError}</div>;
  if (!editPolicies) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-2">{orgName} Security Settings</h2>
      {successMessage && (
        <div className="mb-4 p-2 bg-green-100 text-green-800 rounded">{successMessage}</div>
      )}
      {terminateError && (
        <div className="mb-4 p-2 bg-red-100 text-red-800 rounded">{terminateError}</div>
      )}
      
      <div className="mb-4 flex flex-wrap gap-2 border-b">
        <button
          className={`px-3 py-2 ${activeTab === 'policies' ? 'border-b-2 border-primary font-semibold' : ''}`}
          onClick={() => setActiveTab('policies')}
        >
          Session Policies
        </button>
        <button
          className={`px-3 py-2 ${activeTab === 'password' ? 'border-b-2 border-primary font-semibold' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          Password Policies
        </button>
        <button
          className={`px-3 py-2 ${activeTab === 'mfa' ? 'border-b-2 border-primary font-semibold' : ''}`}
          onClick={() => setActiveTab('mfa')}
        >
          MFA Requirements
        </button>
        <button
          className={`px-3 py-2 ${activeTab === 'ip' ? 'border-b-2 border-primary font-semibold' : ''}`}
          onClick={() => setActiveTab('ip')}
        >
          IP Restrictions
        </button>
        <button
          className={`px-3 py-2 ${activeTab === 'sensitive' ? 'border-b-2 border-primary font-semibold' : ''}`}
          onClick={() => setActiveTab('sensitive')}
        >
          Sensitive Actions
        </button>
      </div>
      
      {activeTab === 'policies' && (
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            handleSavePolicies();
          }}
        >
          <div>
            <label className="block font-medium" htmlFor="session-timeout">Session Timeout (minutes)</label>
            <input
              id="session-timeout"
              type="number"
              className="input input-bordered w-full"
              value={editPolicies.session_timeout_mins}
              onChange={e => setEditPolicies(prev => prev ? {...prev, session_timeout_mins: Number(e.target.value)} : null)}
              aria-label="Session Timeout"
            />
            <p className="text-sm text-gray-500 mt-1">
              How long users can remain idle before being automatically logged out. Set to 0 for no timeout.
            </p>
          </div>
          <div>
            <label className="block font-medium" htmlFor="max-sessions">Max Sessions Per User</label>
            <input
              id="max-sessions"
              type="number"
              className="input input-bordered w-full"
              value={editPolicies.max_sessions_per_user}
              onChange={e => setEditPolicies(prev => prev ? {...prev, max_sessions_per_user: Number(e.target.value)} : null)}
              aria-label="Max Sessions Per User"
            />
            <p className="text-sm text-gray-500 mt-1">
              Maximum number of concurrent sessions a user can have active. When this limit is reached, the oldest session will be terminated.
            </p>
          </div>
          <button type="submit" className="btn btn-primary">Save Session Policies</button>
        </form>
      )}
      
      {activeTab === 'password' && (
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            handleSavePolicies();
          }}
        >
          <div>
            <label className="block font-medium" htmlFor="password-min-length">Minimum Password Length</label>
            <input
              id="password-min-length"
              type="number"
              min="6"
              max="30"
              className="input input-bordered w-full"
              value={editPolicies.password_min_length}
              onChange={e => setEditPolicies(prev => prev ? {...prev, password_min_length: Number(e.target.value)} : null)}
              aria-label="Minimum Password Length"
            />
            <p className="text-sm text-gray-500 mt-1">
              The minimum number of characters required for user passwords.
            </p>
          </div>
          
          <div className="space-y-2">
            <p className="font-medium">Password Complexity Requirements</p>
            
            <div className="flex items-center gap-2">
              <input
                id="require-uppercase"
                type="checkbox"
                checked={editPolicies.password_require_uppercase}
                onChange={e => setEditPolicies(prev => prev ? {...prev, password_require_uppercase: e.target.checked} : null)}
                aria-label="Require Uppercase Letter"
              />
              <label htmlFor="require-uppercase">Require at least one uppercase letter</label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                id="require-lowercase"
                type="checkbox"
                checked={editPolicies.password_require_lowercase}
                onChange={e => setEditPolicies(prev => prev ? {...prev, password_require_lowercase: e.target.checked} : null)}
                aria-label="Require Lowercase Letter"
              />
              <label htmlFor="require-lowercase">Require at least one lowercase letter</label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                id="require-number"
                type="checkbox"
                checked={editPolicies.password_require_number}
                onChange={e => setEditPolicies(prev => prev ? {...prev, password_require_number: e.target.checked} : null)}
                aria-label="Require Number"
              />
              <label htmlFor="require-number">Require at least one number</label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                id="require-symbol"
                type="checkbox"
                checked={editPolicies.password_require_symbol}
                onChange={e => setEditPolicies(prev => prev ? {...prev, password_require_symbol: e.target.checked} : null)}
                aria-label="Require Symbol"
              />
              <label htmlFor="require-symbol">Require at least one special character</label>
            </div>
          </div>
          
          <div>
            <label className="block font-medium" htmlFor="password-expiry">Password Expiry (days)</label>
            <input
              id="password-expiry"
              type="number"
              className="input input-bordered w-full"
              value={editPolicies.password_expiry_days}
              onChange={e => setEditPolicies(prev => prev ? {...prev, password_expiry_days: Number(e.target.value)} : null)}
              aria-label="Password Expiry Days"
            />
            <p className="text-sm text-gray-500 mt-1">
              How often users must change their password. Set to 0 to disable password expiry.
            </p>
          </div>
          
          <div>
            <label className="block font-medium" htmlFor="password-history">Password History Count</label>
            <input
              id="password-history"
              type="number"
              min="0"
              max="10"
              className="input input-bordered w-full"
              value={editPolicies.password_history_count}
              onChange={e => setEditPolicies(prev => prev ? {...prev, password_history_count: Number(e.target.value)} : null)}
              aria-label="Password History Count"
            />
            <p className="text-sm text-gray-500 mt-1">
              Number of previous passwords users cannot reuse. Set to 0 to disable this check.
            </p>
          </div>
          
          <button type="submit" className="btn btn-primary">Save Password Policies</button>
        </form>
      )}
      
      {activeTab === 'mfa' && (
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            handleSavePolicies();
          }}
        >
          <div className="flex items-center gap-2">
            <input
              id="require-mfa"
              type="checkbox"
              checked={editPolicies.require_mfa}
              onChange={e => setEditPolicies(prev => prev ? {...prev, require_mfa: e.target.checked} : null)}
              aria-label="Require MFA"
            />
            <label htmlFor="require-mfa">Require Multi-Factor Authentication for all users</label>
          </div>
          <p className="text-sm text-gray-500 ml-6">
            When enabled, all users will be required to set up MFA upon their next login.
          </p>
          
          <div className="ml-6 space-y-2">
            <p className="font-medium">Allowed MFA Methods</p>
            
            <div className="flex items-center gap-2">
              <input
                id="mfa-totp"
                type="checkbox"
                checked={editPolicies.allowed_mfa_methods.includes('totp')}
                onChange={e => {
                  const newMethods = e.target.checked 
                    ? [...editPolicies.allowed_mfa_methods, 'totp']
                    : editPolicies.allowed_mfa_methods.filter(m => m !== 'totp');
                  setEditPolicies(prev => prev ? {...prev, allowed_mfa_methods: newMethods} : null);
                }}
                aria-label="Allow Authenticator App"
              />
              <label htmlFor="mfa-totp">Authenticator App (TOTP)</label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                id="mfa-sms"
                type="checkbox"
                checked={editPolicies.allowed_mfa_methods.includes('sms')}
                onChange={e => {
                  const newMethods = e.target.checked 
                    ? [...editPolicies.allowed_mfa_methods, 'sms']
                    : editPolicies.allowed_mfa_methods.filter(m => m !== 'sms');
                  setEditPolicies(prev => prev ? {...prev, allowed_mfa_methods: newMethods} : null);
                }}
                aria-label="Allow SMS"
              />
              <label htmlFor="mfa-sms">SMS Verification</label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                id="mfa-email"
                type="checkbox"
                checked={editPolicies.allowed_mfa_methods.includes('email')}
                onChange={e => {
                  const newMethods = e.target.checked 
                    ? [...editPolicies.allowed_mfa_methods, 'email']
                    : editPolicies.allowed_mfa_methods.filter(m => m !== 'email');
                  setEditPolicies(prev => prev ? {...prev, allowed_mfa_methods: newMethods} : null);
                }}
                aria-label="Allow Email"
              />
              <label htmlFor="mfa-email">Email Verification</label>
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary">Save MFA Policies</button>
        </form>
      )}
      
      {activeTab === 'ip' && (
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            handleSavePolicies();
          }}
        >
          <div className="flex items-center gap-2">
            <input
              id="ip-allowlist-enabled"
              type="checkbox"
              checked={editPolicies.ip_allowlist_enabled}
              onChange={e => setEditPolicies(prev => prev ? {...prev, ip_allowlist_enabled: e.target.checked} : null)}
              aria-label="Enable IP Restrictions"
            />
            <label htmlFor="ip-allowlist-enabled">Enable IP Address Restrictions</label>
          </div>
          
          <div className="ml-6">
            <label className="block font-medium" htmlFor="ip-allowlist">Allowed IP Addresses</label>
            <textarea
              id="ip-allowlist"
              className="textarea textarea-bordered w-full"
              value={editPolicies.ip_allowlist.join('\n')}
              onChange={e => setEditPolicies(prev => 
                prev ? {...prev, ip_allowlist: e.target.value.split('\n').filter(ip => ip.trim())} : null
              )}
              placeholder="Enter one IP address or range per line (e.g., 192.168.1.1 or 10.0.0.0/24)"
              rows={5}
              aria-label="Allowed IP Addresses"
            />
            <p className="text-sm text-gray-500 mt-1">
              Only users connecting from these IP addresses will be allowed to log in.
              Leave empty to deny all IPs (except those in denylist).
            </p>
          </div>
          
          <div className="ml-6">
            <label className="block font-medium" htmlFor="ip-denylist">Denied IP Addresses</label>
            <textarea
              id="ip-denylist"
              className="textarea textarea-bordered w-full"
              value={editPolicies.ip_denylist.join('\n')}
              onChange={e => setEditPolicies(prev => 
                prev ? {...prev, ip_denylist: e.target.value.split('\n').filter(ip => ip.trim())} : null
              )}
              placeholder="Enter one IP address or range per line (e.g., 192.168.1.1 or 10.0.0.0/24)"
              rows={5}
              aria-label="Denied IP Addresses"
            />
            <p className="text-sm text-gray-500 mt-1">
              Users connecting from these IP addresses will be denied access, even if they appear in the allowed list.
            </p>
          </div>
          
          <button type="submit" className="btn btn-primary">Save IP Policies</button>
        </form>
      )}
      
      {activeTab === 'sensitive' && (
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            handleSavePolicies();
          }}
        >
          <div className="flex items-center gap-2">
            <input
              id="require-reauth"
              type="checkbox"
              checked={editPolicies.require_reauth_for_sensitive}
              onChange={e => setEditPolicies(prev => prev ? {...prev, require_reauth_for_sensitive: e.target.checked} : null)}
              aria-label="Require Reauthentication"
            />
            <label htmlFor="require-reauth">Require Reauthentication for Sensitive Actions</label>
          </div>
          
          <div className="ml-6">
            <label className="block font-medium" htmlFor="reauth-timeout">Reauthentication Valid Period (minutes)</label>
            <input
              id="reauth-timeout"
              type="number"
              min="1"
              max="60"
              className="input input-bordered w-full"
              value={editPolicies.reauth_timeout_mins}
              onChange={e => setEditPolicies(prev => prev ? {...prev, reauth_timeout_mins: Number(e.target.value)} : null)}
              aria-label="Reauthentication Timeout"
            />
            <p className="text-sm text-gray-500 mt-1">
              How long a reauthentication is valid before requiring another verification.
            </p>
          </div>
          
          <div className="ml-6">
            <div className="font-medium mb-2">Sensitive Actions</div>
            <ul className="mb-2 space-y-2">
              {editPolicies.sensitive_actions.map((action: string) => (
                <li key={action} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => {
                      const newActions = editPolicies.sensitive_actions.filter(a => a !== action);
                      setEditPolicies(prev => prev ? {...prev, sensitive_actions: newActions} : null);
                    }}
                    aria-label={action.replace(/_/g, ' ')}
                  />
                  <span>{action.replace(/_/g, ' ')}</span>
                </li>
              ))}
            </ul>
            
            <div className="flex items-center gap-2">
              <input
                id="new-action"
                type="text"
                className="input input-bordered flex-1"
                placeholder="New sensitive action (e.g., delete_data)"
                aria-label="New Sensitive Action"
              />
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  const input = document.getElementById('new-action') as HTMLInputElement;
                  if (input && input.value) {
                    const newAction = input.value.trim().replace(/\s+/g, '_').toLowerCase();
                    if (newAction && !editPolicies.sensitive_actions.includes(newAction)) {
                      setEditPolicies(prev => 
                        prev ? {...prev, sensitive_actions: [...prev.sensitive_actions, newAction]} : null
                      );
                      input.value = '';
                    }
                  }
                }}
              >
                Add Action
              </button>
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary">Save Sensitive Action Policies</button>
        </form>
      )}
      
      {/* Member sessions management section */}
      <div className="mt-8 border-t pt-4">
        <h3 className="text-xl font-semibold mb-4">Active User Sessions</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border-b text-left">User</th>
                <th className="py-2 px-4 border-b text-left">Email</th>
                <th className="py-2 px-4 border-b text-left">Active Sessions</th>
                <th className="py-2 px-4 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members?.map(member => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{member.name || 'Unknown'}</td>
                  <td className="py-2 px-4 border-b">{member.email}</td>
                  <td className="py-2 px-4 border-b">{member.active_sessions || 0}</td>
                  <td className="py-2 px-4 border-b">
                    {member.active_sessions > 0 && (
                      <button
                        onClick={() => setPendingUserId(member.id)}
                        className="btn btn-sm btn-error"
                        disabled={terminateLoading && pendingUserId === member.id}
                      >
                        {terminateLoading && pendingUserId === member.id 
                          ? 'Terminating...' 
                          : 'Terminate Sessions'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Confirmation dialog */}
      {pendingUserId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Confirm Session Termination</h3>
            <p>Are you sure you want to terminate all active sessions for this user? They will be forced to log in again.</p>
            <div className="mt-4 flex justify-end space-x-2">
              <button 
                className="btn btn-outline"
                onClick={() => setPendingUserId(null)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-error"
                onClick={() => handleTerminateSessions(pendingUserId)}
                disabled={terminateLoading}
              >
                Terminate Sessions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 