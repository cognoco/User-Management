import React from 'react';
import { PermissionLogTimeline as HeadlessTimeline } from '@/ui/headless/audit/PermissionLogTimeline';
import type { PermissionLogTimelineProps } from '@/ui/headless/audit/PermissionLogTimeline';

export function PermissionLogTimeline(props: PermissionLogTimelineProps) {
  return (
    <HeadlessTimeline {...props} renderItem={log => (
      <div className="p-2 border-b" key={log.id}>
        <span>{log.timestamp}</span> - {log.action}
      </div>
    )} />
  );
}
