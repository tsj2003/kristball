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
    <section className="border border-line bg-panel/70">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="display text-lg text-brass">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="py-8 text-center text-sm text-muted">{children}</div>;
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="mb-4 border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{message}</div>;
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-xs uppercase tracking-widest text-muted">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const fieldClass =
  "w-full border border-line bg-field px-3 py-2 text-sm text-ink outline-none focus:border-brass";

export const primaryBtn =
  "display bg-brass px-4 py-2 text-base text-field disabled:opacity-60";

export const ghostBtn =
  "border border-line px-3 py-2 text-xs uppercase tracking-widest text-muted hover:border-brass hover:text-brass";
