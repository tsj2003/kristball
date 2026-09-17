import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatQty } from "../lib/format";
import { ghostBtn } from "./ui";

type Breakdown = {
  purchases: { total: number; rows: Array<Record<string, unknown>> };
  transfersIn: { total: number; rows: Array<Record<string, unknown>> };
  transfersOut: { total: number; rows: Array<Record<string, unknown>> };
  netMovement: number;
};

export function NetMovementModal({
  open,
  onClose,
  breakdown,
}: {
  open: boolean;
  onClose: () => void;
  breakdown: Breakdown | null;
}) {
  if (!open) return null;

  const chart = breakdown
    ? [
        { name: "Purchases", qty: breakdown.purchases.total },
        { name: "Transfers in", qty: breakdown.transfersIn.total },
        { name: "Transfers out", qty: breakdown.transfersOut.total },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/70 px-4 backdrop-blur-sm">
      <div className="plate max-h-[90vh] w-full max-w-3xl overflow-y-auto p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="display text-3xl text-brass">Net movement</h2>
            <p className="text-sm text-muted">Purchases + transfers in − transfers out</p>
          </div>
          <button type="button" className={ghostBtn} onClick={onClose}>
            Close
          </button>
        </div>
        {!breakdown ? (
          <div className="py-10 text-center text-muted">Loading breakdown…</div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Purchases" value={breakdown.purchases.total} />
              <Stat label="Transfers in" value={breakdown.transfersIn.total} />
              <Stat label="Transfers out" value={breakdown.transfersOut.total} />
              <Stat label="Net" value={breakdown.netMovement} />
            </div>
            <div className="mb-6 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <CartesianGrid stroke="#3d463c" vertical={false} />
                  <XAxis dataKey="name" stroke="#b7a88a" fontSize={12} />
                  <YAxis stroke="#b7a88a" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "#12171c", border: "1px solid #3d463c", color: "#f3ead8" }}
                  />
                  <Bar dataKey="qty" fill="#e8a54b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <LineList title="Purchases" rows={breakdown.purchases.rows} kind="purchase" />
            <LineList title="Transfers in" rows={breakdown.transfersIn.rows} kind="in" />
            <LineList title="Transfers out" rows={breakdown.transfersOut.rows} kind="out" />
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="plate px-3 py-2">
      <div className="text-[11px] uppercase tracking-widest text-muted">{label}</div>
      <div className="tabular-nums text-lg">{formatQty(value)}</div>
    </div>
  );
}

function LineList({
  title,
  rows,
  kind,
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
  kind: "purchase" | "in" | "out";
}) {
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-xs uppercase tracking-widest text-muted">{title}</h3>
      {rows.length === 0 ? (
        <div className="text-sm text-muted">None in this window.</div>
      ) : (
        <ul className="space-y-1 text-sm">
          {rows.map((row) => {
            const equipment = row.equipmentType as { name: string; unit: string };
            const qty = Number(row.quantity);
            const when = String(row.purchasedAt || row.transferredAt);
            let extra = "";
            if (kind === "purchase") {
              const base = row.base as { name: string };
              extra = base?.name ?? "";
            } else {
              const fromBase = row.fromBase as { name: string };
              const toBase = row.toBase as { name: string };
              extra = `${fromBase?.name} → ${toBase?.name}`;
            }
            return (
              <li key={String(row.id)} className="flex justify-between gap-3 border-b border-line/50 py-1">
                <span>
                  {equipment?.name} · {extra}
                </span>
                <span className="tabular-nums text-muted">
                  {formatQty(qty, equipment?.unit)} · {formatDate(when)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
