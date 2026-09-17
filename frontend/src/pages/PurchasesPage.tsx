import { FormEvent, useEffect, useState } from "react";
import { api, apiError, Base, EquipmentType } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { DateFilters, Filters } from "../components/DateFilters";
import { EmptyState, ErrorBanner, Field, fieldClass, Panel, primaryBtn } from "../components/ui";
import { PageHeader } from "../components/PageHeader";
import { formatDateTime, formatMoney, formatQty, toDateInput, toDateTimeLocal } from "../lib/format";

const yearStart = `${new Date().getFullYear()}-01-01`;
const today = toDateInput();

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
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    startDate: yearStart,
    endDate: today,
    baseId: "",
    equipmentTypeId: "",
  });
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
      const params: Record<string, string> = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.equipmentTypeId) params.equipmentTypeId = filters.equipmentTypeId;
      if (user?.role === "ADMIN" && filters.baseId) params.baseId = filters.baseId;
      const [p, b, e] = await Promise.all([
        api.get("/purchases", { params }),
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
  }, [filters.startDate, filters.endDate, filters.equipmentTypeId, filters.baseId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const qty = Number(form.quantity);
    const cost = Number(form.unitCost);
    if (!form.equipmentTypeId) {
      setError("Pick an equipment type.");
      return;
    }
    if (!Number.isInteger(qty) || qty < 1) {
      setError("Enter a quantity of at least 1.");
      return;
    }
    if (Number.isNaN(cost) || cost < 0) {
      setError("Enter the unit cost. Use 0 if you do not have a price.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const when = new Date(form.purchasedAt);
      await api.post("/purchases", {
        baseId: form.baseId,
        equipmentTypeId: form.equipmentTypeId,
        quantity: qty,
        unitCost: cost,
        purchasedAt: Number.isNaN(when.getTime()) ? new Date().toISOString() : when.toISOString(),
        notes: form.notes || undefined,
      });
      const day = (form.purchasedAt || today).slice(0, 10);
      const nextEnd = day > filters.endDate ? day : filters.endDate < today ? today : filters.endDate;
      setForm((prev) => ({ ...prev, quantity: "", unitCost: "", notes: "" }));
      setNotice("Saved. The new line is in the list below.");
      if (nextEnd === filters.endDate && !filters.equipmentTypeId) {
        await load();
      } else {
        setFilters((prev) => ({ ...prev, equipmentTypeId: "", endDate: nextEnd }));
      }
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
      {notice && (
        <div className="border border-olive/50 bg-olive/10 px-3 py-2 text-sm text-olive">{notice}</div>
      )}
      <DateFilters
        filters={filters}
        onChange={setFilters}
        bases={bases}
        equipment={equipment}
        showBase={user?.role === "ADMIN"}
      />
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
                placeholder="100"
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
                placeholder="0.31"
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
                    <td className="py-2 pr-3">{formatDateTime(row.purchasedAt)}</td>
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
