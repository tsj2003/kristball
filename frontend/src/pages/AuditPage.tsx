import { useEffect, useState } from "react";
import { api, apiError } from "../api/client";
import { EmptyState, ErrorBanner, Field, fieldClass, Panel } from "../components/ui";
import { formatDateTime } from "../lib/format";

type Log = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: unknown;
  createdAt: string;
  user: { username: string; fullName: string; role: string };
};

export function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState("");

  useEffect(() => {
    api
      .get("/audit-logs", { params: action ? { action } : {} })
      .then((res) => {
        setLogs(res.data.logs);
        setError(null);
      })
      .catch((err) => setError(apiError(err)));
  }, [action]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-3xl">Audit log</h1>
        <p className="mt-1 text-sm text-muted">
          Every login, purchase, transfer, assignment, and expenditure writes an immutable row.
        </p>
      </div>
      <ErrorBanner message={error} />
      <Panel title="Filter">
        <Field label="Action">
          <select className={fieldClass} value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="PURCHASE_CREATED">PURCHASE_CREATED</option>
            <option value="TRANSFER_COMPLETED">TRANSFER_COMPLETED</option>
            <option value="ASSIGNMENT_CREATED">ASSIGNMENT_CREATED</option>
            <option value="EXPENDITURE_RECORDED">EXPENDITURE_RECORDED</option>
          </select>
        </Field>
      </Panel>
      <Panel title="Recent events">
        {logs.length === 0 ? (
          <EmptyState>No audit events match this filter.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-widest text-muted">
                <tr className="border-b border-line">
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Actor</th>
                  <th className="py-2 pr-3 font-medium">Action</th>
                  <th className="py-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-line/70 align-top">
                    <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                    <td className="py-2 pr-3">
                      {log.user.fullName}
                      <div className="text-xs text-muted">{log.user.username}</div>
                    </td>
                    <td className="py-2 pr-3">{log.action}</td>
                    <td className="py-2 font-mono text-xs text-muted">
                      {log.details ? JSON.stringify(log.details) : log.entityType}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
