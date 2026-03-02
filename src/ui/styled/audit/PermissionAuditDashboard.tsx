import React from 'react';
import { PermissionAuditDashboard as Headless } from '@/ui/headless/audit/PermissionAuditDashboard';
import { PermissionLogTimeline } from './PermissionLogTimeline';
import { PermissionHistoryView } from './PermissionHistoryView';
import { PermissionDiffViewer } from './PermissionDiffViewer';
import { PermissionSummary } from './PermissionSummary';
import type { PermissionAuditDashboardProps } from '@/ui/headless/audit/PermissionAuditDashboard';

export function PermissionAuditDashboard(props: Omit<PermissionAuditDashboardProps, 'children'>) {
  return (
    <Headless {...props}>
      {({ logs }) => (
        <div className="space-y-4">
          <PermissionSummary logs={logs} />
          <PermissionLogTimeline logs={logs} renderItem={(log) => <div key={log.id}>{log.timestamp} - {log.action}</div>} />
          <PermissionHistoryView logs={logs} />
          {logs.length >= 2 && (
            <PermissionDiffViewer
              before={{ action: logs[0].action, status: logs[0].status }}
              after={{ action: logs[logs.length - 1].action, status: logs[logs.length - 1].status }}
            />
          )}
        </div>
      )}
    </Headless>
  );
}
