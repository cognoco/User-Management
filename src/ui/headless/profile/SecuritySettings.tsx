/**
 * Headless SecuritySettings Component
 *
 * Manages MFA and security policy preferences using render props.
 */

import { useEffect } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { useOrganizationPolicies } from '@/hooks/user/useOrganizationSession';

export interface SecuritySettingsProps {
  organizationId?: string;
  render: (props: SecuritySettingsRenderProps) => React.ReactNode;
}

export interface SecuritySettingsRenderProps {
  mfaEnabled: boolean;
  toggleMfa: () => Promise<void>;
  policies: any | null;
  updatePolicies: (p: any) => Promise<boolean>;
  loading: boolean;
  error?: string;
}

export function SecuritySettings({ organizationId, render }: SecuritySettingsProps) {
  const {
    mfaEnabled,
    setupMFA,
    disableMFA,
    isLoading: authLoading,
    error: authError,
  } = useAuth();

  const { policies, loading, error, fetchPolicies, updatePolicies } = useOrganizationPolicies(
    organizationId || ''
  );

  useEffect(() => {
    if (organizationId) fetchPolicies();
  }, [organizationId, fetchPolicies]);

  const toggleMfa = async () => {
    if (mfaEnabled) await disableMFA();
    else await setupMFA();
  };

  return (
    <>{render({
      mfaEnabled,
      toggleMfa,
      policies,
      updatePolicies,
      loading: authLoading || loading,
      error: authError || error || undefined,
    })}</>
  );
}
