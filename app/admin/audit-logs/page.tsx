import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/auth';
import type { User as SupabaseUser } from '@supabase/auth-js';
import { hasPermission } from '@/lib/auth/hasPermission';
import { AdminAuditLogs } from '@/ui/styled/admin/audit-logs/AdminAuditLogs';

export const metadata: Metadata = {
  title: 'Admin Audit Logs',
  description: 'View and manage system audit logs',
};

export default async function AdminAuditLogsPage(): Promise<JSX.Element> {
  // Get current user and check permissions
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const user: SupabaseUser | null = data.user;

  if (error || !user) {
    redirect('/auth/login');
  }
  
  // Check if user has admin permissions to view audit logs
  const canViewAuditLogs = await hasPermission(user.id, 'VIEW_ALL_USER_ACTION_LOGS');
  
  if (!canViewAuditLogs) {
    return (
      <div className="container py-10">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <h2 className="text-lg font-semibold text-destructive mb-2">Access denied</h2>
          <p>You do not have permission to view audit logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">
          View and manage system activity logs
        </p>
      </div>
      
      <AdminAuditLogs />
    </div>
  );
} 