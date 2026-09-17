import { LogOut } from "lucide-react";
import type { SessionUser } from "../api/client";
import { BRAND } from "../brand";
import { roleLabel } from "../lib/format";
import { ghostBtn } from "./ui";
import { MissionClock } from "./MissionClock";

export function Navbar({ user, onSignOut }: { user: SessionUser; onSignOut: () => void }) {
  return (
    <header className="relative z-10 flex items-center justify-between gap-4 border-b border-line/60 bg-night/45 px-4 py-3 backdrop-blur-md lg:px-8">
      <div>
        <div className="display text-2xl text-ink">Command floor</div>
        <div className="text-xs text-muted">
          {user.fullName} · {roleLabel(user.role)}
          {user.base ? ` · ${user.base.name}` : " · all stations"}
        </div>
        <div className="mono mt-1 hidden text-[10px] tracking-[0.18em] text-sand uppercase sm:block">{BRAND.grid}</div>
      </div>
      <div className="flex items-center gap-4">
        <MissionClock />
        <button type="button" className={`${ghostBtn} min-h-11`} onClick={onSignOut}>
          <span className="inline-flex items-center gap-2">
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Sign out
          </span>
        </button>
      </div>
    </header>
  );
}
