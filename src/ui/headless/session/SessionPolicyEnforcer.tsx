/**
 * Headless Session Policy Enforcer
 *
 * Periodically enforces session policies without rendering UI.
 */
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
// import { api } from '@/lib/api/axios'; // Do not import axios in client bundle
import { useAuth } from '@/hooks/auth/useAuth';

export interface SessionPolicyEnforcerProps {
  intervalMs?: number;
  children?: React.ReactNode;
}

export function SessionPolicyEnforcer({ intervalMs = 5 * 60 * 1000, children }: SessionPolicyEnforcerProps) {
  const enforceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();

  const enforceSessionPolicies = async () => {
    if (!isAuthenticated) return;
    try {
      await api.post('/api/session/enforce-policies');
    } catch (error: any) {
      if (error.response?.status === 401) {
        logout();
        router.push('/login?reason=session_expired');
      }
    }
  };

  useEffect(() => {
    enforceSessionPolicies();
    enforceIntervalRef.current = setInterval(enforceSessionPolicies, intervalMs);
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => enforceSessionPolicies();
    activityEvents.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    return () => {
      if (enforceIntervalRef.current) clearInterval(enforceIntervalRef.current);
      activityEvents.forEach(e => window.removeEventListener(e, handleActivity));
    };
  }, [isAuthenticated, intervalMs]);

  return <>{children}</>;
}
