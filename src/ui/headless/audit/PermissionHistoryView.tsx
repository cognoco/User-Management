import React from 'react';
import type { AuditLog } from '@/ui/headless/audit/AuditLogViewer';

export interface PermissionHistoryViewProps {
  logs: AuditLog[];
}

export function PermissionHistoryView({ logs }: PermissionHistoryViewProps) {
  return (
    <ul>{logs.map(l => <li key={l.id}>{l.action}</li>)}</ul>
  );
}
