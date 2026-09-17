import { FormEvent, useEffect, useState } from "react";
import { api, apiError, PersonnelHolding } from "../api/client";
import { formatQty, toDateTimeLocal } from "../lib/format";
import { ErrorBanner, Field, fieldClass, ghostBtn, primaryBtn } from "./ui";

export function ExpendDialog({
  target,
  onClose,
  onSaved,
}: {
  target: PersonnelHolding | null;
  onClose: () => void;
  onSaved: (remaining: number) => void | Promise<void>;
}) {
  const [quantity, setQuantity] = useState("");
  const [expendedAt, setExpendedAt] = useState(toDateTimeLocal());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setQuantity("");
    setExpendedAt(toDateTimeLocal());
    setNotes("");
    setError(null);
    setBusy(false);
  }, [target?.assignmentId]);

  if (!target) return null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!target) return;
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      setError("Enter a whole number of at least 1.");
      return;
    }
    if (qty > target.remaining) {
      setError(
        `No. ${target.rank} ${target.personnelName} only has ${formatQty(target.remaining, target.unit)} left. You cannot expend ${formatQty(qty, target.unit)}.`
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const when = new Date(expendedAt);
      const res = await api.post("/assignments/expenditures", {
        assignmentId: target.assignmentId,
        quantity: qty,
        expendedAt: Number.isNaN(when.getTime()) ? new Date().toISOString() : when.toISOString(),
        notes: notes || undefined,
      });
      await onSaved(typeof res.data?.remaining === "number" ? res.data.remaining : target.remaining - qty);
      onClose();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/70 px-4 backdrop-blur-sm">
      <div className="plate w-full max-w-lg p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mono text-[10px] tracking-[0.24em] text-sand">RECORD EXPENDED</div>
            <h2 className="display mt-1 text-3xl text-brass">
              {target.rank} {target.personnelName}
            </h2>
            <p className="mt-1 text-sm text-muted">{target.equipmentName}</p>
          </div>
          <button type="button" className={ghostBtn} onClick={onClose}>
            Cancel
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <div className="plate px-2 py-2">
            <div className="text-[10px] uppercase tracking-widest text-muted">Got</div>
            <div className="tabular-nums text-brass">{formatQty(target.assignedQty, target.unit)}</div>
          </div>
          <div className="plate px-2 py-2">
            <div className="text-[10px] uppercase tracking-widest text-muted">Used</div>
            <div className="tabular-nums">{formatQty(target.expended, target.unit)}</div>
          </div>
          <div className="plate px-2 py-2">
            <div className="text-[10px] uppercase tracking-widest text-muted">Still with him</div>
            <div className="tabular-nums text-olive">{formatQty(target.remaining, target.unit)}</div>
          </div>
        </div>

        <ErrorBanner message={error} />

        <form onSubmit={onSubmit} className="grid gap-3">
          <Field label="How many used now">
            <input
              required
              type="number"
              min={1}
              max={target.remaining}
              placeholder="200"
              className={fieldClass}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
          <Field label="When">
            <input
              required
              type="datetime-local"
              className={fieldClass}
              value={expendedAt}
              onChange={(e) => setExpendedAt(e.target.value)}
            />
          </Field>
          <Field label="Notes">
            <input className={fieldClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <button className={primaryBtn} disabled={busy} type="submit">
            {busy ? "Saving…" : "Save expended"}
          </button>
        </form>
      </div>
    </div>
  );
}
