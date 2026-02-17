import React from 'react';
import type { SessionInfo } from '@/core/session/models';

export interface SessionCardProps {
  session: SessionInfo;
  isCurrent?: boolean;
  onTerminate?: (id: string) => void;
}

export function SessionCard({ session, isCurrent, onTerminate }: SessionCardProps) {
  return (
    <div className="border rounded p-2 flex items-center justify-between">
      <div>
        <div className="font-medium">{session.userAgent || 'Unknown'}</div>
        <div className="text-xs text-gray-500">{session.ipAddress || '-'} | {session.lastActiveAt ? new Date(session.lastActiveAt).toLocaleString() : '-'}</div>
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
