import { useEffect, useState } from "react";
import { api, apiError } from "../api/client";
import { EmptyState, ErrorBanner, Field, fieldClass, Panel } from "../components/ui";
import { PageHeader } from "../components/PageHeader";
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

type AccessLog = {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip: string | null;
  createdAt: string;
  user: { username: string; fullName: string } | null;
};

export function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [access, setAccess] = useState<AccessLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/audit-logs", { params: action ? { action } : {} }),
      api.get("/audit-logs/access"),
    ])
      .then(([mutations, http]) => {
        setLogs(mutations.data.logs);
        setAccess(http.data.logs);
        setError(null);
      })
      .catch((err) => setError(apiError(err)));
  }, [action]);

  return (
    <div className="space-y-6">
      <PageHeader kicker="ARMIGER // JOURNAL" title="Journal">
        Mutation rows are written in the same database transaction as the change. HTTP access rows are written by
        logger middleware for every API call. Bodies are never stored.
      </PageHeader>
      <ErrorBanner message={error} />
      <Panel title="Filter mutations">
        <Field label="Action">
          <select className={fieldClass} value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All mutation actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="PURCHASE_CREATED">PURCHASE_CREATED</option>
            <option value="TRANSFER_PENDING">TRANSFER_PENDING</option>
            <option value="TRANSFER_IN_TRANSIT">TRANSFER_IN_TRANSIT</option>
            <option value="TRANSFER_COMPLETED">TRANSFER_COMPLETED</option>
            <option value="ASSIGNMENT_CREATED">ASSIGNMENT_CREATED</option>
            <option value="EXPENDITURE_RECORDED">EXPENDITURE_RECORDED</option>
          </select>
        </Field>
      </Panel>
      <Panel title="Business events">
        {logs.length === 0 ? (
          <EmptyState>No audit events match this filter.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[800px]">
              <thead>
                <tr>
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Actor</th>
                  <th className="py-2 pr-3 font-medium">Action</th>
                  <th className="py-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="align-top">
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
      <Panel title="HTTP access log (all APIs)">
        {access.length === 0 ? (
          <EmptyState>No HTTP access rows yet.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[800px]">
              <thead>
                <tr>
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Actor</th>
                  <th className="py-2 pr-3 font-medium">Request</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">ms</th>
                </tr>
              </thead>
              <tbody>
                {access.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                    <td className="py-2 pr-3">{row.user ? row.user.username : "anonymous"}</td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {row.method} {row.path}
                    </td>
                    <td className="py-2 pr-3">{row.statusCode}</td>
                    <td className="py-2">{row.durationMs}</td>
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
