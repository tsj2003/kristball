import { PersonnelHolding } from "../api/client";
import { formatDateTime, formatQty } from "../lib/format";
import { EmptyState, ghostBtn } from "./ui";

export function PersonnelHoldings({
  rows,
  onExpend,
  canExpend,
}: {
  rows: PersonnelHolding[];
  onExpend?: (row: PersonnelHolding) => void;
  canExpend?: boolean;
}) {
  if (rows.length === 0) {
    return <EmptyState>No personnel currently hold assigned equipment.</EmptyState>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table min-w-[860px]">
        <thead>
          <tr>
            <th className="py-2 pr-3 font-medium">Personnel</th>
            <th className="py-2 pr-3 font-medium">Equipment</th>
            <th className="py-2 pr-3 font-medium">Assigned</th>
            <th className="py-2 pr-3 font-medium">Expended</th>
            <th className="py-2 pr-3 font-medium">Remaining</th>
            <th className="py-2 pr-3 font-medium">Issued</th>
            {canExpend && onExpend ? <th className="py-2 font-medium">Action</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.assignmentId}>
              <td className="py-2 pr-3">
                <div>
                  {row.rank} {row.personnelName}
                </div>
                <div className="text-xs text-muted">{row.serviceNumber}</div>
              </td>
              <td className="py-2 pr-3">{row.equipmentName}</td>
              <td className="py-2 pr-3 tabular-nums">{formatQty(row.assignedQty, row.unit)}</td>
              <td className="py-2 pr-3 tabular-nums">{formatQty(row.expended, row.unit)}</td>
              <td className="py-2 pr-3 tabular-nums text-brass">{formatQty(row.remaining, row.unit)}</td>
              <td className="py-2 pr-3 text-muted">{formatDateTime(row.assignedAt)}</td>
              {canExpend && onExpend ? (
                <td className="py-2">
                  {row.remaining > 0 ? (
                    <button type="button" className={ghostBtn} onClick={() => onExpend(row)}>
                      Record expended
                    </button>
                  ) : (
                    <span className="text-xs text-muted">None left</span>
                  )}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
