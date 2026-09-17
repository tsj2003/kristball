import { Summary } from "../api/client";
import { formatQty } from "../lib/format";

export function MetricCards({
  summary,
  onNetClick,
}: {
  summary: Summary;
  onNetClick: () => void;
}) {
  const secondary = [
    { label: "Purchases", value: summary.purchases },
    { label: "Transfers in", value: summary.transfersIn },
    { label: "Transfers out", value: summary.transfersOut },
    { label: "Assigned", value: summary.assigned },
    { label: "Expended", value: summary.expended },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="plate hero-plate px-5 py-5">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted">Opening</div>
          <div className="mono mt-2 text-4xl text-ink sm:text-5xl">{formatQty(summary.opening)}</div>
          <div className="mt-2 text-[11px] text-muted">Activity before the window</div>
        </div>
        <button type="button" onClick={onNetClick} className="plate hero-plate net cursor-pointer px-5 py-5 text-left">
          <div className="text-[11px] uppercase tracking-[0.2em] text-brass">Net movement</div>
          <div className="mono mt-2 text-4xl text-brass sm:text-5xl">{formatQty(summary.netMovement)}</div>
          <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-sand">Click for purchases · in · out</div>
        </button>
        <div className="plate hero-plate px-5 py-5">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted">Closing</div>
          <div className="mono mt-2 text-4xl text-ink sm:text-5xl">{formatQty(summary.closing)}</div>
          <div className="mt-2 text-[11px] text-muted">Opening + net − assigned − expended</div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {secondary.map((card) => (
          <div key={card.label} className="plate px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted">{card.label}</div>
            <div className="mono mt-1 text-xl text-ink">{formatQty(card.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
