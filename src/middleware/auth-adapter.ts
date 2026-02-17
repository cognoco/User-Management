import { type NextRequest } from 'next/server';
import { getApiPermissionService } from '@/services/permission/factory';
import { getCurrentSession, getSessionFromRequest } from '@/lib/auth/session';
import type { CurrentSession } from '@/lib/auth/session';
export type { RouteAuthContext, RouteAuthOptions } from './auth';
export { withRouteAuth, withAuthRequest } from './auth';

/**
 * Shape of the session object returned by {@link getServerSession}.
 */
export interface AdapterSession {
  user: {
    id: string;
    email: string;
    role: string | undefined;
    permissions: string[];
  };
}

async function buildSession(session: CurrentSession): Promise<AdapterSession> {
  const permissionService = getApiPermissionService();
  const roles = await permissionService.getUserRoles(session.userId);
  const roleName = roles[0]?.role?.name;

  const permissionsSet = new Set<string>();
  for (const r of roles) {
    const role = await permissionService.getRoleById(r.roleId);
    role?.permissions.forEach(p => permissionsSet.add(p));
  }

  return {
    user: {
      id: session.userId,
      email: session.email,
      role: roleName,
      permissions: Array.from(permissionsSet),
    },
  };
}

/**
 * Replacement for `next-auth`\'s `getServerSession` using Supabase auth.
 *
 * The optional parameter is kept for compatibility but ignored.
 */
export async function getServerSession(
  req?: NextRequest | any
): Promise<AdapterSession | null> {
  const baseSession: CurrentSession | null = req
    ? await getSessionFromRequest(req as NextRequest)
    : await getCurrentSession();

  if (!baseSession) return null;
  if (baseSession.expiresAt <= Date.now()) return null;
  return buildSession(baseSession);
}
