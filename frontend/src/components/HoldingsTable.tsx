import { Holding } from "../api/client";
import { formatQty } from "../lib/format";
import { EmptyState } from "./ui";

export function HoldingsTable({ rows, showBase }: { rows: Holding[]; showBase: boolean }) {
  if (rows.length === 0) {
    return <EmptyState>No holdings match the current filters.</EmptyState>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-[11px] uppercase tracking-widest text-muted">
          <tr className="border-b border-line">
            {showBase && <th className="py-2 pr-3 font-medium">Base</th>}
            <th className="py-2 pr-3 font-medium">Equipment</th>
            <th className="py-2 pr-3 font-medium">Received</th>
            <th className="py-2 pr-3 font-medium">Available</th>
            <th className="py-2 pr-3 font-medium">Assigned remaining</th>
            <th className="py-2 font-medium">Expended</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.baseId}-${row.equipmentTypeId}`} className="border-b border-line/70">
              {showBase && (
                <td className="py-2 pr-3">
                  {row.baseName}
                  <span className="ml-1 text-muted">({row.baseCode})</span>
                </td>
              )}
              <td className="py-2 pr-3">
                <div>{row.name}</div>
                <div className="text-xs text-muted">{row.category}</div>
              </td>
              <td className="py-2 pr-3 tabular-nums">{formatQty(row.received, row.unit)}</td>
              <td className="py-2 pr-3 tabular-nums text-olive">{formatQty(row.available, row.unit)}</td>
              <td className="py-2 pr-3 tabular-nums text-brass">{formatQty(row.assignedRemaining, row.unit)}</td>
              <td className="py-2 tabular-nums">{formatQty(row.expended, row.unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
