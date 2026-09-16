import { Summary } from "../api/client";
import { formatQty } from "../lib/format";

export function MetricCards({
  summary,
  onNetClick,
}: {
  summary: Summary;
  onNetClick: () => void;
}) {
  const cards = [
    { key: "opening", label: "Opening balance", value: summary.opening, hint: "Activity before start date" },
    { key: "purchases", label: "Purchases", value: summary.purchases },
    { key: "in", label: "Transfers in", value: summary.transfersIn },
    { key: "out", label: "Transfers out", value: summary.transfersOut },
    { key: "net", label: "Net movement", value: summary.netMovement, action: true },
    { key: "assigned", label: "Assigned", value: summary.assigned, hint: "Issued to personnel this period" },
    { key: "expended", label: "Expended", value: summary.expended },
    { key: "closing", label: "Closing balance", value: summary.closing, hint: "Opening + net − assigned − expended" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <button
          key={card.key}
          type="button"
          onClick={card.action ? onNetClick : undefined}
          className={`border border-line bg-field/60 px-4 py-3 text-left ${
            card.action ? "hover:border-brass" : ""
          }`}
        >
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted">{card.label}</div>
          <div className="mt-1 font-medium text-2xl tabular-nums text-ink">{formatQty(card.value)}</div>
          {card.hint && <div className="mt-1 text-[11px] text-muted">{card.hint}</div>}
          {card.action && <div className="mt-1 text-[11px] text-brass">View breakdown</div>}
        </button>
      ))}
    </div>
  );
}
