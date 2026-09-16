import { FormEvent, useEffect, useState } from "react";
import { api, apiError, Base, EquipmentType } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { EmptyState, ErrorBanner, Field, fieldClass, Panel, primaryBtn } from "../components/ui";
import { formatDate, formatQty, toDateTimeLocal } from "../lib/format";

type Transfer = {
  id: string;
  quantity: number;
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
      });
      setForm((prev) => ({ ...prev, quantity: "", notes: "" }));
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-3xl">Transfers</h1>
        <p className="mt-1 text-sm text-muted">
          Moves unassigned stock between bases. The origin must have enough armory quantity; the write is one database
          transaction.
        </p>
      </div>
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
            <div className="sm:col-span-2 lg:col-span-3">
              <button className={primaryBtn} disabled={busy} type="submit">
                {busy ? "Checking stock…" : "Complete transfer"}
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
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-widest text-muted">
                <tr className="border-b border-line">
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Route</th>
                  <th className="py-2 pr-3 font-medium">Equipment</th>
                  <th className="py-2 pr-3 font-medium">Qty</th>
                  <th className="py-2 font-medium">Initiated by</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-line/70">
                    <td className="py-2 pr-3">{formatDate(row.transferredAt)}</td>
                    <td className="py-2 pr-3">
                      {row.fromBase.name} → {row.toBase.name}
                    </td>
                    <td className="py-2 pr-3">{row.equipmentType.name}</td>
                    <td className="py-2 pr-3 tabular-nums">{formatQty(row.quantity, row.equipmentType.unit)}</td>
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
