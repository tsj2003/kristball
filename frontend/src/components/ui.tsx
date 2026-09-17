import { ReactNode } from "react";

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="plate">
      <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
        <h2 className="display text-xl text-brass">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="py-10 text-center">
      <div className="mono text-[10px] tracking-[0.28em] text-sand">NO ROWS</div>
      <div className="mt-2 text-sm text-muted">{children}</div>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-4 border border-danger/50 bg-danger/15 px-3 py-2 text-sm text-danger">
      {message}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-xs uppercase tracking-[0.18em] text-muted">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const fieldClass =
  "w-full min-h-11 border border-line/80 bg-field/80 px-3 py-2 text-sm text-ink outline-none focus:border-brass";

export const primaryBtn =
  "display cursor-pointer bg-brass px-4 py-2.5 text-xl text-field disabled:opacity-60 hover:brightness-110";

export const ghostBtn =
  "cursor-pointer border border-line px-3 py-2 text-xs uppercase tracking-widest text-muted hover:border-brass hover:text-brass";
