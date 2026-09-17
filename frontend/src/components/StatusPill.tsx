export function StatusPill({ status }: { status: "PENDING" | "IN_TRANSIT" | "COMPLETED" | string }) {
  const cls =
    status === "COMPLETED" ? "pill-done" : status === "IN_TRANSIT" ? "pill-transit" : "pill-pending";
  return <span className={`pill ${cls}`}>{status.replaceAll("_", " ")}</span>;
}
