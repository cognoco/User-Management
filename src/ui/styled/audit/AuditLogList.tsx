import { AuditLogList as HeadlessList } from '@/ui/headless/audit/AuditLogList';
import { AuditLogFilter as HeadlessFilter } from '@/ui/headless/audit/AuditLogFilter';
import { useAuditLogs } from '@/hooks/audit/useAuditLogs';

export function AuditLogList(): React.ReactElement {
  const { logs, isLoading, error, filters, setFilter, page, total, setPage, exportLogs } = useAuditLogs();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <HeadlessFilter filters={filters} onChange={setFilter} />
        <button className="border rounded px-2" onClick={() => exportLogs()}>Export</button>
      </div>
      <HeadlessList logs={logs} isLoading={isLoading} error={error} />
      <div className="flex justify-end gap-2 text-sm">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button>
        <span>{page}</span>
        <button disabled={logs.length + (page - 1) * 20 >= total} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

