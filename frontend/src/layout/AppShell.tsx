import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Boxes, ClipboardList, LayoutDashboard, LogOut, Repeat, Shield, Truck } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { roleLabel } from "../lib/format";
import type { Role } from "../api/client";

const links: { to: string; label: string; icon: typeof LayoutDashboard; roles: Role[] }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "BASE_COMMANDER", "LOGISTICS_OFFICER"] },
  { to: "/purchases", label: "Purchases", icon: Boxes, roles: ["ADMIN", "LOGISTICS_OFFICER", "BASE_COMMANDER"] },
  { to: "/transfers", label: "Transfers", icon: Repeat, roles: ["ADMIN", "LOGISTICS_OFFICER", "BASE_COMMANDER"] },
  { to: "/assignments", label: "Assignments", icon: Truck, roles: ["ADMIN", "BASE_COMMANDER", "LOGISTICS_OFFICER"] },
  { to: "/audit", label: "Audit log", icon: ClipboardList, roles: ["ADMIN"] },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const visible = links.filter((link) => link.roles.includes(user.role));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-panel/80 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-brass/50 bg-field">
            <Shield className="h-5 w-5 text-brass" />
          </div>
          <div>
            <div className="display text-lg text-brass">Kristallball</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted">Asset command</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {visible.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-sm px-3 py-2 text-sm whitespace-nowrap ${
                    isActive ? "bg-brass/15 text-brass" : "text-ink/80 hover:bg-line/60"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="hidden border-t border-line px-5 py-4 lg:block">
          <div className="text-sm font-medium">{user.fullName}</div>
          <div className="text-xs text-muted">{roleLabel(user.role)}</div>
          <div className="text-xs text-muted">{user.base ? user.base.name : "All bases"}</div>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted hover:text-brass"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-line px-4 py-3 lg:px-8">
          <div>
            <div className="display text-xl text-ink">Military Asset Management</div>
            <div className="text-xs text-muted">
              Signed in as {user.username}
              {user.base ? ` · ${user.base.code}` : " · global"}
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-sm border border-line px-3 py-1.5 text-xs uppercase tracking-widest lg:hidden"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </header>
        <main className="px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
