// Create file: lib/auth/unified-auth.middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthContext } from './types';
import { getServiceSupabase } from '@/lib/database/supabase';
import { getApiPermissionService } from '@/services/permission/factory';
import type { AuthService } from '@/core/auth/interfaces';

export type AuthHandler = (
  req: NextRequest,
  context: AuthContext
) => Promise<NextResponse> | NextResponse;

export const createAuthMiddleware = (options?: {
  requireAuth?: boolean;
  requiredPermissions?: string[];
  includeUser?: boolean;
  authService?: AuthService;
}) => {
  return (handler: AuthHandler) => {
    return async (req: NextRequest) => {
      const supabase = options?.authService ? null : getServiceSupabase();
      const authHeader = req.headers.get('authorization');
      let token: string | null = null;
      
      // Try auth header first
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
      
      // Fall back to cookies if no token in header
      if (!token) {
        // Get token from cookies
        token = req.cookies.get('auth-token')?.value || null;
      }
      
      // Default auth context - unauthenticated
      let context: AuthContext = {
        userId: '',
        permissions: [],
        authenticated: false
      };
      
      if (token) {
        try {
          let user: any;
          if (options?.authService && (options.authService as any).getSession) {
            const session = await (options.authService as any).getSession(token);
            user = session?.user;
            if (!user) throw new Error('User not found');
          } else if (supabase) {
            const { data, error } = await supabase.auth.getUser(token);
            if (error || !data.user) {
              throw error || new Error('User not found');
            }
            user = data.user;
          } else {
            throw new Error('No auth service available');
          }

          const userId = user.id;
          context = {
            userId,
            authenticated: true,
            permissions: []
          };

          if (options?.includeUser) {
            context.user = {
              id: userId,
              email: user.email || '',
              role: (user as any).app_metadata?.role || (user as any).user_metadata?.role,
              metadata: {
                ...(user as any).app_metadata,
                ...(user as any).user_metadata
              }
            };
          }
          
          // Load permissions if required
          if (options?.requiredPermissions?.length) {
            const permissionService = getApiPermissionService();
            const userPermissions = await (permissionService as any).getUserPermissions?.(userId) ?? await permissionService.getRolePermissions(userId);
            context.permissions = userPermissions;
            
            // Check if user has all required permissions
            const hasAllPermissions = options.requiredPermissions.every(
              permission => userPermissions.includes(permission)
            );
            
            if (!hasAllPermissions) {
              return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
          }
        } catch (error) {
          console.error('Auth error:', error);
          
          if (options?.requireAuth !== false) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }
        }
      } else if (options?.requireAuth !== false) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      return handler(req, context);
    };
  };
};
