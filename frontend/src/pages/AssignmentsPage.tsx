import { FormEvent, useEffect, useState } from "react";
import { api, apiError, Base, EquipmentType, Person, PersonnelHolding } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { EmptyState, ErrorBanner, Field, fieldClass, ghostBtn, Panel, primaryBtn } from "../components/ui";
import { PageHeader } from "../components/PageHeader";
import { PersonnelHoldings } from "../components/PersonnelHoldings";
import { formatQty, toDateTimeLocal } from "../lib/format";

export function AssignmentsPage() {
  const { user } = useAuth();
  const canWrite = user?.role === "ADMIN" || user?.role === "BASE_COMMANDER";
  const [people, setPeople] = useState<Person[]>([]);
  const [bases, setBases] = useState<Base[]>([]);
  const [equipment, setEquipment] = useState<EquipmentType[]>([]);
  const [rows, setRows] = useState<PersonnelHolding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expendTarget, setExpendTarget] = useState<PersonnelHolding | null>(null);
  const [form, setForm] = useState({
    baseId: user?.baseId ?? "",
    personnelId: "",
    equipmentTypeId: "",
    quantity: "",
    assignedAt: toDateTimeLocal(),
    notes: "",
  });
  const [expend, setExpend] = useState({
    quantity: "",
    expendedAt: toDateTimeLocal(),
    notes: "",
  });

  async function load() {
    try {
      const [a, p, b, e] = await Promise.all([
        api.get("/dashboard/personnel-holdings"),
        api.get("/personnel"),
        api.get("/bases"),
        api.get("/equipment-types"),
      ]);
      setRows(a.data.assignments);
      setPeople(p.data.personnel);
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

  async function onAssign(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post("/assignments", {
        baseId: form.baseId,
        personnelId: form.personnelId,
        equipmentTypeId: form.equipmentTypeId,
        quantity: Number(form.quantity),
        assignedAt: new Date(form.assignedAt).toISOString(),
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

  async function onExpend(event: FormEvent) {
    event.preventDefault();
    if (!expendTarget) return;
    setBusy(true);
    try {
      await api.post("/assignments/expenditures", {
        assignmentId: expendTarget.assignmentId,
        quantity: Number(expend.quantity),
        expendedAt: new Date(expend.expendedAt).toISOString(),
        notes: expend.notes || undefined,
      });
      setExpendTarget(null);
      setExpend({ quantity: "", expendedAt: toDateTimeLocal(), notes: "" });
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  const filteredPeople = people.filter((person) => !form.baseId || person.baseId === form.baseId);

  return (
    <div className="space-y-6">
      <PageHeader kicker="ARMIGER // ISSUE" title="Issue & expend">
        Issuing equipment to a person reduces cage stock. Recording an expenditure reduces that person's remaining
        quantity automatically.
      </PageHeader>
      <ErrorBanner message={error} />

      {canWrite && (
        <Panel title="Issue to personnel">
          <form onSubmit={onAssign} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {user?.role === "ADMIN" && (
              <Field label="Base">
                <select
                  required
                  className={fieldClass}
                  value={form.baseId}
                  onChange={(e) => setForm({ ...form, baseId: e.target.value, personnelId: "" })}
                >
                  <option value="">Select base</option>
                  {bases.map((base) => (
                    <option key={base.id} value={base.id}>
                      {base.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Personnel">
              <select
                required
                className={fieldClass}
                value={form.personnelId}
                onChange={(e) => setForm({ ...form, personnelId: e.target.value })}
              >
                <option value="">Select person</option>
                {filteredPeople.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.rank} {person.fullName}
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
            <Field label="Assigned at">
              <input
                required
                type="datetime-local"
                className={fieldClass}
                value={form.assignedAt}
                onChange={(e) => setForm({ ...form, assignedAt: e.target.value })}
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
                {busy ? "Issuing…" : "Assign from armory"}
              </button>
            </div>
          </form>
        </Panel>
      )}

      {expendTarget && canWrite && (
        <Panel
          title={`Expend from ${expendTarget.rank} ${expendTarget.personnelName}`}
          action={
            <button type="button" className={ghostBtn} onClick={() => setExpendTarget(null)}>
              Cancel
            </button>
          }
        >
          <p className="mb-3 text-sm text-muted">
            Currently remaining: {formatQty(expendTarget.remaining, expendTarget.unit)} of {expendTarget.equipmentName}.
          </p>
          <form onSubmit={onExpend} className="grid gap-3 sm:grid-cols-3">
            <Field label="Quantity expended">
              <input
                required
                type="number"
                min={1}
                max={expendTarget.remaining}
                className={fieldClass}
                value={expend.quantity}
                onChange={(e) => setExpend({ ...expend, quantity: e.target.value })}
              />
            </Field>
            <Field label="When">
              <input
                required
                type="datetime-local"
                className={fieldClass}
                value={expend.expendedAt}
                onChange={(e) => setExpend({ ...expend, expendedAt: e.target.value })}
              />
            </Field>
            <Field label="Notes">
              <input
                className={fieldClass}
                value={expend.notes}
                onChange={(e) => setExpend({ ...expend, notes: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-3">
              <button className={primaryBtn} disabled={busy} type="submit">
                {busy ? "Recording…" : "Record expenditure"}
              </button>
            </div>
          </form>
        </Panel>
      )}

      <Panel title="Current assignments">
        {rows.length === 0 ? (
          <EmptyState>No assignments on the books.</EmptyState>
        ) : (
          <PersonnelHoldings rows={rows} canExpend={canWrite} onExpend={setExpendTarget} />
        )}
      </Panel>
    </div>
  );
}
