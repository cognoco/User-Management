import { useState, useCallback } from 'react';
import { supabase } from '@/lib/database/supabase';
import { OrganizationSecurityPolicy, DEFAULT_SECURITY_POLICY } from '@/types/organizations';
// import types from /src/types if available

export function useOrganizationPolicies(orgId: string) {
  const [policies, setPolicies] = useState<OrganizationSecurityPolicy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('security_settings')
        .eq('id', orgId)
        .single();
      
      if (error) throw error;
      
      // Initialize with default values if not set or missing fields
      if (!data?.security_settings) {
        const defaultPolicies = {...DEFAULT_SECURITY_POLICY};
        // Initialize organization with default policies if none exist
        await supabase
          .from('organizations')
          .update({ security_settings: defaultPolicies })
          .eq('id', orgId);
        setPolicies(defaultPolicies);
      } else {
        // Merge with defaults to ensure all fields exist even if database has older schema
        const mergedPolicies = {
          ...DEFAULT_SECURITY_POLICY, 
          ...data.security_settings
        };
        setPolicies(mergedPolicies);
      }
    } catch (err: any) {
      console.error('Error fetching organization policies:', err);
      setError(err.message || 'Failed to fetch organization policies');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const updatePolicies = useCallback(async (newPolicies: OrganizationSecurityPolicy) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ security_settings: newPolicies })
        .eq('id', orgId);
      
      if (error) throw error;
      
      setPolicies(newPolicies);
    } catch (err: any) {
      console.error('Error updating organization policies:', err);
      setError(err.message || 'Failed to update organization policies');
      return false;
    } finally {
      setLoading(false);
    }
    return true;
  }, [orgId]);

  return { policies, loading, error, fetchPolicies, updatePolicies };
}

export function useOrganizationMembers(orgId: string) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', orgId);
    if (error) setError(error.message);
    setMembers(data || []);
    setLoading(false);
  }, [orgId]);

  return { members, loading, error, refetch: fetchMembers };
}

export function useTerminateUserSessions(orgId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  const terminateUserSessions = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    setCount(null);
    const { data, error } = await supabase.rpc('terminate_user_sessions', { user_id: userId, organization_id: orgId });
    if (error) setError(error.message);
    setCount((data as any)?.count || 0);
    setLoading(false);
    return { count: (data as any)?.count || 0, error };
  }, [orgId]);

  return { terminateUserSessions, loading, error, count };
}

export function useReauthentication() {
  const [showDialog, setShowDialog] = useState(false);
  const [requireReauth, setRequireReauth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyReauth = useCallback(async (email: string, password: string) => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else setShowDialog(false);
    return !error;
  }, []);

  return { showDialog, setShowDialog, requireReauth, setRequireReauth, verifyReauth, error };
} 