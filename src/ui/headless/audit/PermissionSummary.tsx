import React from 'react';
import type { AuditLog } from '@/ui/headless/audit/AuditLogViewer';

export interface PermissionSummaryProps {
  logs: AuditLog[];
}

export function PermissionSummary({ logs }: PermissionSummaryProps) {
  return <div>Total changes: {logs.length}</div>;
}
