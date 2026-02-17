import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import type { Permission } from '@/core/permission/models';

export function usePermission(permission: Permission | Permission[]) {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHasPermission(false);
      setLoading(false);
      return;
    }

    const permissionsToCheck = Array.isArray(permission)
      ? permission
      : [permission];

    async function checkPermissions() {
      setLoading(true);
      try {
        const response = await fetch('/api/auth/check-permissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            checks: permissionsToCheck.map((p) => ({ permission: p })),
          }),
        });

        if (!response.ok) throw new Error('Permission check failed');

        const data = await response.json();
        const hasAnyPermission = data.data.results.some(
          (r: any) => r.hasPermission,
        );
        setHasPermission(hasAnyPermission);
      } catch (error) {
        console.error('Permission check error:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    }

    checkPermissions();
  }, [user, permission]);

  return { hasPermission, loading };
}
