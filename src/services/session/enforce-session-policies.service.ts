import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createSessionProvider } from '@/adapters/session/factory';
import { getSessionTimeout, getMaxSessionsPerUser } from '@/lib/security/security-policy.service';

export interface EnforceResult {
  success: boolean;
  message?: string;
  error?: string;
}

export async function enforceSessionPolicies(
  req: NextRequest,
  res: NextResponse
): Promise<EnforceResult> {
  const sessionProvider = createSessionProvider({
    type: 'supabase',
    options: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    }
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: name => req.cookies.get(name)?.value,
        set: (name, value, options) => {
          res.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          res.cookies.set({ name, value: '', ...options });
        }
      }
    }
  );

  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();
    if (error || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const orgId = user.user_metadata?.current_organization_id;
    if (!orgId) {
      return { success: true, message: 'No organization policy to enforce' };
    }

    const sessions = await sessionProvider.listUserSessions(user.id);
    const timeoutMinutes = await getSessionTimeout(orgId);
    const maxSessions = await getMaxSessionsPerUser(orgId);

    if (timeoutMinutes > 0) {
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const now = Date.now();
      for (const session of sessions) {
        if (!session.lastActiveAt) continue;
        const last = new Date(session.lastActiveAt).getTime();
        if (now - last > timeoutMs) {
          await sessionProvider.deleteUserSession(user.id, session.id);
        }
      }
    }

    if (maxSessions > 0 && sessions.length > maxSessions) {
      const sorted = [...sessions].sort((a, b) => {
        const aTime = a.lastActiveAt
          ? new Date(a.lastActiveAt).getTime()
          : new Date(a.createdAt).getTime();
        const bTime = b.lastActiveAt
          ? new Date(b.lastActiveAt).getTime()
          : new Date(b.createdAt).getTime();
        return aTime - bTime;
      });

      const toRemove = sorted.length - maxSessions;
      let removed = 0;
      for (const s of sorted) {
        if (removed >= toRemove) break;
        if (!s.isCurrent) {
          await sessionProvider.deleteUserSession(user.id, s.id);
          removed++;
        }
      }
    }

    await supabase.auth.updateUser({ data: { last_activity: new Date().toISOString() } });
    return { success: true, message: 'Session policies enforced' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
