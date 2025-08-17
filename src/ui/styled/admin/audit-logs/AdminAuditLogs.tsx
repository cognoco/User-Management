"use client";

import { AuditLogViewer } from '@/ui/styled/audit/AuditLogViewer';
import {
  AdminAuditLogs as HeadlessAdminAuditLogs,
} from '@/ui/headless/admin/audit-logs/AdminAuditLogs';

export function AdminAuditLogs(): React.ReactElement {
  return (
    <HeadlessAdminAuditLogs>
      {({ isError }) =>
        isError ? (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
            <h2 className="text-lg font-semibold text-destructive mb-2">Error</h2>
            <p>Failed to fetch audit logs. Please try again later.</p>
          </div>
        ) : (
          <AuditLogViewer isAdmin={true} />
        )
      }
    </HeadlessAdminAuditLogs>
  );
}
