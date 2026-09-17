import { FormEvent, useEffect, useState } from "react";
import { api, apiError, Base, EquipmentType } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { EmptyState, ErrorBanner, Field, fieldClass, Panel, primaryBtn } from "../components/ui";
import { PageHeader } from "../components/PageHeader";
import { formatDate, formatMoney, formatQty } from "../lib/format";
import { toDateTimeLocal } from "../lib/format";

type Purchase = {
  id: string;
  quantity: number;
  unitCost: string;
  purchasedAt: string;
  notes: string | null;
  base: { name: string; code: string };
  equipmentType: { name: string; unit: string; category: string };
  purchasedBy: { fullName: string };
};

export function PurchasesPage() {
  const { user } = useAuth();
  const canWrite = user?.role === "ADMIN" || user?.role === "LOGISTICS_OFFICER";
  const [rows, setRows] = useState<Purchase[]>([]);
  const [bases, setBases] = useState<Base[]>([]);
  const [equipment, setEquipment] = useState<EquipmentType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    baseId: user?.baseId ?? "",
    equipmentTypeId: "",
    quantity: "",
    unitCost: "",
    purchasedAt: toDateTimeLocal(),
    notes: "",
  });

  async function load() {
    try {
      const [p, b, e] = await Promise.all([
        api.get("/purchases"),
        api.get("/bases"),
        api.get("/equipment-types"),
      ]);
      setRows(p.data.purchases);
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
      await api.post("/purchases", {
        baseId: form.baseId,
        equipmentTypeId: form.equipmentTypeId,
        quantity: Number(form.quantity),
        unitCost: Number(form.unitCost),
        purchasedAt: new Date(form.purchasedAt).toISOString(),
        notes: form.notes || undefined,
      });
      setForm((prev) => ({ ...prev, quantity: "", unitCost: "", notes: "" }));
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader kicker="ARMIGER // INBOUND" title="Inbound">
          New stock enters a station ledger here. Quantities immediately increase cage available.
      </PageHeader>
      <ErrorBanner message={error} />
      {canWrite && (
        <Panel title="Record a purchase">
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Base">
              <select
                required
                className={fieldClass}
                value={form.baseId}
                disabled={user?.role !== "ADMIN"}
                onChange={(e) => setForm({ ...form, baseId: e.target.value })}
              >
                <option value="">Select base</option>
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
            <Field label="Unit cost (USD)">
              <input
                required
                type="number"
                min={0}
                step="0.01"
                className={fieldClass}
                value={form.unitCost}
                onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
              />
            </Field>
            <Field label="Purchased at">
              <input
                required
                type="datetime-local"
                className={fieldClass}
                value={form.purchasedAt}
                onChange={(e) => setForm({ ...form, purchasedAt: e.target.value })}
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
                {busy ? "Saving…" : "Post purchase"}
              </button>
            </div>
          </form>
        </Panel>
      )}
      <Panel title="Purchase history">
        {rows.length === 0 ? (
          <EmptyState>No purchases recorded yet.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[800px]">
              <thead>
                <tr>
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Base</th>
                  <th className="py-2 pr-3 font-medium">Equipment</th>
                  <th className="py-2 pr-3 font-medium">Qty</th>
                  <th className="py-2 pr-3 font-medium">Unit cost</th>
                  <th className="py-2 font-medium">Posted by</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-3">{formatDate(row.purchasedAt)}</td>
                    <td className="py-2 pr-3">{row.base.name}</td>
                    <td className="py-2 pr-3">{row.equipmentType.name}</td>
                    <td className="py-2 pr-3 tabular-nums">{formatQty(row.quantity, row.equipmentType.unit)}</td>
                    <td className="py-2 pr-3">{formatMoney(row.unitCost)}</td>
                    <td className="py-2 text-muted">{row.purchasedBy.fullName}</td>
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
