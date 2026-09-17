import { FormEvent, useEffect, useRef, useState } from "react";
import { api, apiError, Base, EquipmentType } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { DateFilters, Filters } from "../components/DateFilters";
import { EmptyState, ErrorBanner, Field, fieldClass, ghostBtn, Panel, primaryBtn } from "../components/ui";
import { PageHeader } from "../components/PageHeader";
import { formatDateTime, formatMoney, formatQty, toDateTimeLocal } from "../lib/format";

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

function asPurchase(raw: Record<string, unknown>, fallbackName: string): Purchase | null {
  if (!raw || typeof raw.id !== "string") return null;
  const base = (raw.base as Purchase["base"] | undefined) ?? { name: "Unknown base", code: "" };
  const equipmentType = (raw.equipmentType as Purchase["equipmentType"] | undefined) ?? {
    name: "Unknown type",
    unit: "ea",
    category: "",
  };
  const purchasedBy = (raw.purchasedBy as Purchase["purchasedBy"] | undefined) ?? { fullName: fallbackName };
  return {
    id: raw.id,
    quantity: Number(raw.quantity ?? 0),
    unitCost: String(raw.unitCost ?? "0"),
    purchasedAt: String(raw.purchasedAt ?? new Date().toISOString()),
    notes: (raw.notes as string | null) ?? null,
    base,
    equipmentType,
    purchasedBy,
  };
}

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
    startDate: "",
    endDate: "",
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
  const requestSeq = useRef(0);

  function applyList(payload: unknown) {
    const incoming = Array.isArray(payload) ? payload : [];
    setRows(
      incoming
        .map((item) => asPurchase(item as Record<string, unknown>, user?.fullName ?? "Unknown"))
        .filter((item): item is Purchase => item !== null)
    );
  }

  async function load(params?: Record<string, string>) {
    const seq = ++requestSeq.current;
    try {
      const query: Record<string, string> = { ...(params ?? {}) };
      if (!params) {
        if (filters.startDate) query.startDate = filters.startDate;
        if (filters.endDate) query.endDate = filters.endDate;
        if (filters.equipmentTypeId) query.equipmentTypeId = filters.equipmentTypeId;
        if (user?.role === "ADMIN" && filters.baseId) query.baseId = filters.baseId;
      }
      const [p, b, e] = await Promise.all([
        api.get("/purchases", { params: query }),
        api.get("/bases"),
        api.get("/equipment-types"),
      ]);
      if (seq !== requestSeq.current) return;
      applyList(p.data?.purchases);
      setBases(b.data.bases);
      setEquipment(e.data.equipmentTypes);
      setError(null);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(apiError(err));
    }
  }

  useEffect(() => {
    if (user?.baseId) {
      setForm((prev) => (prev.baseId ? prev : { ...prev, baseId: user.baseId! }));
    }
  }, [user?.baseId]);

  useEffect(() => {
    void load();
    // Reload when the visible filters change. load reads the latest filters from this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.startDate, filters.endDate, filters.equipmentTypeId, filters.baseId, user?.role]);

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
    const baseId = form.baseId || user?.baseId || "";
    if (!baseId) {
      setError("Pick a base.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const when = new Date(form.purchasedAt);
      const res = await api.post("/purchases", {
        baseId,
        equipmentTypeId: form.equipmentTypeId,
        quantity: qty,
        unitCost: cost,
        purchasedAt: Number.isNaN(when.getTime()) ? new Date().toISOString() : when.toISOString(),
        notes: form.notes || undefined,
      });
      const created = asPurchase(
        (res.data?.purchase ?? res.data) as Record<string, unknown>,
        user?.fullName ?? "You"
      );
      if (created) {
        requestSeq.current += 1;
        setRows((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
      }
      setForm((prev) => ({ ...prev, quantity: "", unitCost: "", notes: "" }));
      setNotice("Saved. The new line is at the top of Purchase history.");
      setFilters({ startDate: "", endDate: "", baseId: "", equipmentTypeId: "" });
      await load({});
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
      <div className="-mt-3">
        <button
          type="button"
          className={ghostBtn}
          onClick={() => setFilters({ startDate: "", endDate: "", baseId: "", equipmentTypeId: "" })}
        >
          Show all dates
        </button>
      </div>
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
      <Panel
        title="Purchase history"
        action={<span className="mono text-[10px] tracking-[0.2em] text-muted">{rows.length} rows</span>}
      >
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
                    <td className="py-2 pr-3">{row.base?.name ?? "—"}</td>
                    <td className="py-2 pr-3">{row.equipmentType?.name ?? "—"}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatQty(row.quantity, row.equipmentType?.unit)}
                    </td>
                    <td className="py-2 pr-3">{formatMoney(row.unitCost)}</td>
                    <td className="py-2 text-muted">{row.purchasedBy?.fullName ?? "—"}</td>
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
