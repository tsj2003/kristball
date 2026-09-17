import { FormEvent, useEffect, useState } from "react";
import { api, apiError, Base, EquipmentType } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { EmptyState, ErrorBanner, Field, fieldClass, Panel, primaryBtn } from "../components/ui";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { formatDateTime, formatQty, toDateTimeLocal } from "../lib/format";

type Transfer = {
  id: string;
  quantity: number;
  status: "PENDING" | "IN_TRANSIT" | "COMPLETED";
  transferredAt: string;
  notes: string | null;
  fromBase: { name: string; code: string };
  toBase: { name: string; code: string };
  equipmentType: { name: string; unit: string };
  initiatedBy: { fullName: string };
};

export function TransfersPage() {
  const { user } = useAuth();
  const canWrite = user?.role === "ADMIN" || user?.role === "LOGISTICS_OFFICER";
  const [rows, setRows] = useState<Transfer[]>([]);
  const [bases, setBases] = useState<Base[]>([]);
  const [equipment, setEquipment] = useState<EquipmentType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    fromBaseId: user?.baseId ?? "",
    toBaseId: "",
    equipmentTypeId: "",
    quantity: "",
    transferredAt: toDateTimeLocal(),
    notes: "",
    status: "COMPLETED" as Transfer["status"],
  });

  async function load() {
    try {
      const [t, b, e] = await Promise.all([
        api.get("/transfers"),
        api.get("/bases"),
        api.get("/equipment-types"),
      ]);
      setRows(t.data.transfers);
      setBases(b.data.bases);
      setEquipment(e.data.equipmentTypes);
      setError(null);
    } catch (err) {
      setError(apiError(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post("/transfers", {
        fromBaseId: form.fromBaseId,
        toBaseId: form.toBaseId,
        equipmentTypeId: form.equipmentTypeId,
        quantity: Number(form.quantity),
        transferredAt: new Date(form.transferredAt).toISOString(),
        notes: form.notes || undefined,
        status: form.status,
      });
      setForm((prev) => ({ ...prev, quantity: "", notes: "" }));
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function advanceStatus(id: string, status: Transfer["status"]) {
    setBusy(true);
    try {
      await api.patch(`/transfers/${id}/status`, { status });
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader kicker="ARMIGER // CROSS-LEVEL" title="Cross-level">
        Moves unassigned stock between bases. PENDING / IN_TRANSIT do not change balances until the transfer is
        COMPLETED. Completing a transfer re-checks cage stock inside one database transaction.
      </PageHeader>
      <ErrorBanner message={error} />
      {canWrite && (
        <Panel title="Move stock">
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="From base">
              <select
                required
                className={fieldClass}
                value={form.fromBaseId}
                disabled={user?.role !== "ADMIN"}
                onChange={(e) => setForm({ ...form, fromBaseId: e.target.value })}
              >
                <option value="">Select origin</option>
                {bases.map((base) => (
                  <option key={base.id} value={base.id}>
                    {base.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="To base">
              <select
                required
                className={fieldClass}
                value={form.toBaseId}
                onChange={(e) => setForm({ ...form, toBaseId: e.target.value })}
              >
                <option value="">Select destination</option>
                {bases.map((base) => (
                  <option key={base.id} value={base.id}>
                    {base.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Equipment">
              <select
                required
                className={fieldClass}
                value={form.equipmentTypeId}
                onChange={(e) => setForm({ ...form, equipmentTypeId: e.target.value })}
              >
                <option value="">Select type</option>
                {equipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quantity">
              <input
                required
                type="number"
                min={1}
                className={fieldClass}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </Field>
            <Field label="Transferred at">
              <input
                required
                type="datetime-local"
                className={fieldClass}
                value={form.transferredAt}
                onChange={(e) => setForm({ ...form, transferredAt: e.target.value })}
              />
            </Field>
            <Field label="Notes">
              <input
                className={fieldClass}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <select
                className={fieldClass}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Transfer["status"] })}
              >
                <option value="COMPLETED">COMPLETED (moves stock now)</option>
                <option value="IN_TRANSIT">IN_TRANSIT (no stock move yet)</option>
                <option value="PENDING">PENDING (request only)</option>
              </select>
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <button className={primaryBtn} disabled={busy} type="submit">
                {busy ? "Saving…" : form.status === "COMPLETED" ? "Complete transfer" : "Record transfer"}
              </button>
            </div>
          </form>
        </Panel>
      )}
      <Panel title="Transfer history">
        {rows.length === 0 ? (
          <EmptyState>No transfers recorded yet.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[800px]">
              <thead>
                <tr>
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Route</th>
                  <th className="py-2 pr-3 font-medium">Equipment</th>
                  <th className="py-2 pr-3 font-medium">Qty</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Initiated by</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-3">{formatDateTime(row.transferredAt)}</td>
                    <td className="py-2 pr-3">
                      {row.fromBase.name} → {row.toBase.name}
                    </td>
                    <td className="py-2 pr-3">{row.equipmentType.name}</td>
                    <td className="py-2 pr-3 tabular-nums">{formatQty(row.quantity, row.equipmentType.unit)}</td>
                    <td className="py-2 pr-3">
                      <div>
                        <StatusPill status={row.status} />
                      </div>
                      {canWrite && row.status === "PENDING" && (
                        <button
                          type="button"
                          className="mt-1 text-xs text-brass"
                          disabled={busy}
                          onClick={() => advanceStatus(row.id, "IN_TRANSIT")}
                        >
                          Mark in transit
                        </button>
                      )}
                      {canWrite && row.status !== "COMPLETED" && (
                        <button
                          type="button"
                          className="mt-1 block text-xs text-olive"
                          disabled={busy}
                          onClick={() => advanceStatus(row.id, "COMPLETED")}
                        >
                          Complete & move stock
                        </button>
                      )}
                    </td>
                    <td className="py-2 text-muted">{row.initiatedBy.fullName}</td>
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
