import React from 'react';
import { SessionList as HeadlessSessionList } from '@/ui/headless/session/SessionList';
import type { SessionInfo } from '@/core/session/models';

export interface StyledSessionListProps {
  sessions: SessionInfo[];
  currentSessionId?: string;
  loading: boolean;
  error?: string | null;
  onTerminate: (id: string) => void;
  onTerminateAll: () => void;
}

export function SessionList(props: StyledSessionListProps) {
  return (
    <HeadlessSessionList
      {...props}
      render={({ sessions, currentSessionId, loading, error, onTerminate, onTerminateAll }) => (
        <div className="rounded border p-4 max-w-lg mx-auto bg-white shadow">
          <h3 className="text-lg font-semibold mb-2">Active Sessions</h3>
          {loading ? (
            <div className="text-gray-500">Loading sessions...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : sessions.length === 0 ? (
            <div className="text-gray-500">No active sessions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left">Device</th>
                    <th className="px-4 py-2 text-left">IP</th>
                    <th className="px-4 py-2 text-left">Last Active</th>
                    <th className="px-4 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(session => (
                    <tr key={session.id} className={session.id === currentSessionId ? 'bg-blue-50' : ''}>
                      <td className="px-4 py-2">
                        {session.userAgent || 'Unknown'}
                        {session.id === currentSessionId && (
                          <span className="ml-2 text-xs text-blue-600 font-semibold">(Current)</span>
                        )}
                      </td>
                      <td className="px-4 py-2">{session.ipAddress || '-'}</td>
                      <td className="px-4 py-2">{session.lastActiveAt ? new Date(session.lastActiveAt).toLocaleString() : '-'}</td>
                      <td className="px-4 py-2">
                        {session.id === currentSessionId ? (
                          <span className="text-gray-400">Active</span>
                        ) : (
                          <button
                            className="text-red-600 hover:underline"
                            onClick={() => onTerminate(session.id)}
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sessions.length > 1 && (
                <div className="mt-4 text-right">
                  <button className="text-sm text-red-600 hover:underline" onClick={onTerminateAll}>
                    Terminate Other Sessions
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    />
  );
}

export default SessionList;
