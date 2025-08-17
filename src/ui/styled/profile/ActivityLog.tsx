import { format } from 'date-fns';
import { ActivityLog as HeadlessActivityLog } from '@/ui/headless/profile/ActivityLog';

export default function ActivityLog(): React.ReactElement {
  return (
    <HeadlessActivityLog>
      {({ logs, isLoading, error, page, totalPages, setFilter }) => (
        <div className="rounded border p-4 max-w-2xl mx-auto bg-white shadow mt-6">
          <h3 className="text-lg font-semibold mb-2">Account Activity Log</h3>
          {isLoading ? (
            <div className="text-gray-500">Loading activity log...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : logs.length === 0 ? (
            <div className="text-gray-500">No activity found.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Action</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">IP</th>
                  <th className="px-4 py-2 text-left">Device</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2">{format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}</td>
                    <td className="px-4 py-2">{log.action}</td>
                    <td className="px-4 py-2">{log.status}</td>
                    <td className="px-4 py-2">{log.ip_address || '-'}</td>
                    <td className="px-4 py-2">{log.user_agent ? log.user_agent.split(' ')[0] : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="flex justify-between items-center mt-4">
            <button
              className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
              onClick={() => setFilter('page', Math.max(1, page - 1))}
              disabled={page === 1 || isLoading}
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
              onClick={() => setFilter('page', Math.min(totalPages, page + 1))}
              disabled={page === totalPages || isLoading}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </HeadlessActivityLog>
  );
}
