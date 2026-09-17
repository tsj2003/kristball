import { NavLink } from "react-router-dom";
import { Boxes, ClipboardList, LayoutDashboard, Repeat, Shield, Truck } from "lucide-react";
import { BRAND } from "../brand";
import { roleLabel } from "../lib/format";
import type { Role, SessionUser } from "../api/client";

const links: { to: string; label: string; icon: typeof LayoutDashboard; roles: Role[] }[] = [
  { to: "/", label: "Sitrep", icon: LayoutDashboard, roles: ["ADMIN", "BASE_COMMANDER", "LOGISTICS_OFFICER"] },
  { to: "/purchases", label: "Inbound", icon: Boxes, roles: ["ADMIN", "LOGISTICS_OFFICER", "BASE_COMMANDER"] },
  { to: "/transfers", label: "Cross-level", icon: Repeat, roles: ["ADMIN", "LOGISTICS_OFFICER", "BASE_COMMANDER"] },
  { to: "/assignments", label: "Issue", icon: Truck, roles: ["ADMIN", "BASE_COMMANDER", "LOGISTICS_OFFICER"] },
  { to: "/audit", label: "Journal", icon: ClipboardList, roles: ["ADMIN"] },
];

export function Sidebar({ user }: { user: SessionUser }) {
  const visible = links.filter((link) => link.roles.includes(user.role));

  return (
    <aside className="relative z-10 flex flex-col border-b border-line/60 bg-night/60 backdrop-blur-md lg:min-h-[calc(100dvh-32px)] lg:border-r lg:border-b-0">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-12 w-12 items-center justify-center border border-brass/70 bg-field/70 shadow-[0_0_18px_rgba(232,165,75,0.2)]">
          <Shield className="h-5 w-5 text-brass" aria-hidden />
        </div>
        <div>
          <div className="mark text-xl text-brass">{BRAND.name}</div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-sand">{BRAND.line}</div>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible" aria-label="Primary">
        {visible.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-2 px-3 py-2 text-sm tracking-wide whitespace-nowrap ${
                  isActive
                    ? "border-l-2 border-brass bg-brass/12 text-brass"
                    : "border-l-2 border-transparent text-ink/80 hover:bg-line/30 hover:text-sand"
                }`
              }
            >
              <Icon className="h-4 w-4" aria-hidden />
              {link.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="mt-auto hidden border-t border-line/50 px-5 py-4 lg:block">
        <div className="mono text-[10px] tracking-[0.2em] text-brass uppercase">{user.username}</div>
        <div className="mt-1 text-xs text-muted">{roleLabel(user.role)}</div>
        <div className="text-[10px] uppercase tracking-[0.16em] text-sand">{user.base?.code ?? "GLOBAL"}</div>
      </div>
    </aside>
  );
}
