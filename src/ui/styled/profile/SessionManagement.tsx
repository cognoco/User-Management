import React from 'react';
import { SessionManagement as HeadlessSessionManagement } from '@/ui/headless/profile/SessionManagement';
import { toast } from '@/lib/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/ui/primitives/alert-dialog';

const SessionManagement: React.FC = () => {
  const [pendingSessionId, setPendingSessionId] = React.useState<string | null>(null);

  return (
    <HeadlessSessionManagement
      render={({ sessions, loading, error, revoke }) => {
        const handleRevoke = async () => {
          if (!pendingSessionId) return;
          await revoke(pendingSessionId);
          toast({
            title: 'Session revoked',
            description: 'The session has been successfully revoked.',
          });
          setPendingSessionId(null);
        };

        return (
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
                <table className="min-w-full divide-y divide-gray-200 text-sm sm:text-base">
                  <thead>
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left">Device</th>
                      <th scope="col" className="px-4 py-2 text-left">IP</th>
                      <th scope="col" className="px-4 py-2 text-left">Last Active</th>
                      <th scope="col" className="px-4 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr key={session.id} className={session.isCurrent ? 'bg-blue-50' : ''}>
                        <td className="px-4 py-2">
                          {session.userAgent || 'Unknown'}
                          {session.isCurrent && (
                            <span className="ml-2 text-xs text-blue-600 font-semibold">
                              (Current)
                              <span className="sr-only">(Current session)</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">{session.ipAddress || '-'}</td>
                        <td className="px-4 py-2">{session.lastActiveAt ? new Date(session.lastActiveAt).toLocaleString() : '-'}</td>
                        <td className="px-4 py-2">
                          {session.isCurrent ? (
                            <span className="text-gray-400">Active</span>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  className="text-red-600 hover:underline disabled:opacity-50"
                                  onClick={() => setPendingSessionId(session.id)}
                                  disabled={loading}
                                  aria-label="Revoke this session"
                                >
                                  Revoke
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Revoke Session</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to revoke this session? This will log out the device associated with this session.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setPendingSessionId(null)}>
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction onClick={handleRevoke} disabled={loading}>
                                    Revoke
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }}
    />
  );
};

export default SessionManagement;
