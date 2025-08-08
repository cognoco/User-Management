import { useState, useEffect, useCallback } from 'react';
// Avoid direct supabase in client; rely on server-sent events or noop for now
import { useAuth } from '@/hooks/auth/useAuth';

interface AdminRealtimeOptions {
  enabled?: boolean;
}

export function useAdminRealtimeChannel(options: AdminRealtimeOptions = {}) {
  const { enabled = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  const [userChangeListeners] = useState(new Set<(payload: any) => void>());

  const addUserChangeListener = useCallback(
    (listener: (payload: any) => void) => {
      userChangeListeners.add(listener);
      return () => {
        userChangeListeners.delete(listener);
      };
    },
    [userChangeListeners]
  );

  useEffect(() => {
    if (!user || !enabled) return;
    // TODO: replace with SSE/WebSocket via API route; for now mark disconnected
    setIsConnected(false);
  }, [user, enabled]);

  return { isConnected, addUserChangeListener };
}
