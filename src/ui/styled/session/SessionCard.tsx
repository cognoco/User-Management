import React from 'react';
import type { SessionInfo } from '@/core/session/models';

export interface SessionCardProps {
  session: SessionInfo;
  isCurrent?: boolean;
  onTerminate?: (id: string) => void;
}

export function SessionCard({ session, isCurrent, onTerminate }: SessionCardProps): React.ReactElement {
  return (
    <div className="border rounded p-2 flex items-center justify-between">
      <div>
        <div className="font-medium">{session.user_agent || 'Unknown'}</div>
        <div className="text-xs text-gray-500">{session.ip_address || '-'} | {session.last_active_at ? new Date(session.last_active_at).toLocaleString() : '-'}</div>
      </div>
      {isCurrent ? (
        <span className="text-sm text-gray-500">Current</span>
      ) : (
        <button className="text-sm text-red-600 hover:underline" onClick={() => onTerminate?.(session.id)}>
          Revoke
        </button>
      )}
    </div>
  );
}

export default SessionCard;
