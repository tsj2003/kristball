import type { ReactNode } from "react";

export function PageHeader({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <div className="mono text-[10px] tracking-[0.28em] text-sand uppercase">{kicker}</div>
      <h1 className="display mt-1 text-4xl leading-none text-ink sm:text-5xl">{title}</h1>
      {children ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{children}</p> : null}
    </header>
  );
}
