import React from 'react';
import type { AuditLog } from '@/ui/headless/audit/AuditLogViewer';

export interface PermissionLogTimelineProps {
  logs: AuditLog[];
  renderItem: (log: AuditLog) => React.ReactNode;
}

export function PermissionLogTimeline({ logs, renderItem }: PermissionLogTimelineProps) {
  return (
    <div>{logs.map(log => <div key={log.id}>{renderItem(log)}</div>)}</div>
  );
}
