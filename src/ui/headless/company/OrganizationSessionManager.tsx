'use client';

import React, { useEffect, useState } from 'react';
import { useOrganizationPolicies, useOrganizationMembers, useTerminateUserSessions } from '@/hooks/user/useOrganizationSession';
import { OrganizationSecurityPolicy } from '@/types/organizations';

export interface OrganizationSessionManagerProps {
  orgId: string;
  render: (props: {
    policies: OrganizationSecurityPolicy | null;
    members: any[];
    editPolicies: OrganizationSecurityPolicy | null;
    setEditPolicies: (p: OrganizationSecurityPolicy) => void;
    savePolicies: () => Promise<void>;
    terminateSessions: (userId: string) => Promise<void>;
    loading: boolean;
    error: string | null;
    success: string | null;
  }) => React.ReactNode;
}

export function OrganizationSessionManager({ orgId, render }: OrganizationSessionManagerProps): React.ReactElement => {
  const { policies, loading: policiesLoading, error: policiesError, fetchPolicies, updatePolicies } = useOrganizationPolicies(orgId);
  const { members, loading: membersLoading, error: membersError, refetch: refetchMembers } = useOrganizationMembers(orgId);
  const { terminateUserSessions, loading: terminateLoading, error: terminateError, count } = useTerminateUserSessions(orgId);

  const [editPolicies, setEditPolicies] = useState<OrganizationSecurityPolicy | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => { if (policies) setEditPolicies({ ...policies }); }, [policies]);
  useEffect(() => { fetchPolicies(); refetchMembers(); }, [fetchPolicies, refetchMembers]);

  const savePolicies = async (): Promise<void> => {
    if (!editPolicies) return;
    await updatePolicies(editPolicies);
    setSuccessMessage('Settings updated');
    setTimeout(() => setSuccessMessage(null), 2000);
    fetchPolicies();
  };

  const terminateSessions = async (userId: string): Promise<void> => {
    await terminateUserSessions(userId);
    setSuccessMessage(`${count || 0} sessions terminated`);
    setTimeout(() => setSuccessMessage(null), 2000);
    refetchMembers();
  };

  const loading = policiesLoading || membersLoading || terminateLoading;
  const error = policiesError || membersError || terminateError || null;

  return (
    <>{render({ policies, members, editPolicies, setEditPolicies: p => setEditPolicies(p), savePolicies, terminateSessions, loading, error, success: successMessage })}</>
  );
}
