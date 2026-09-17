export function SkeletonRow({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton plate" />
      ))}
    </div>
  );
}
