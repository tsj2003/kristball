import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { BRAND } from "../brand";
import { fieldClass, primaryBtn } from "../components/ui";
import { MissionClock } from "../components/MissionClock";

export function LoginPage() {
  const { user, login, error } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await login(username, password);
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="login-sky relative flex min-h-dvh items-stretch">
      <div className="class-tape absolute inset-x-0 top-0 z-20">
        <span className="live-dot" aria-hidden />
        {BRAND.classification}
      </div>
      <div className="relative z-10 flex w-full max-w-xl flex-col justify-center px-6 py-24 sm:px-12">
        <div className="mb-4 flex items-center justify-between text-sand">
          <span className="mono text-[10px] tracking-[0.22em] uppercase">{BRAND.grid}</span>
          <MissionClock />
        </div>
        <div className="plate p-8 sm:p-10">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center border border-brass/80 bg-field/50 shadow-[0_0_24px_rgba(232,165,75,0.25)]">
              <Shield className="h-8 w-8 text-brass" aria-hidden />
            </div>
            <div>
              <div className="mark text-4xl text-brass">{BRAND.name}</div>
              <div className="text-xs uppercase tracking-[0.32em] text-sand">{BRAND.line}</div>
            </div>
          </div>
          <p className="mb-8 max-w-sm text-sm leading-relaxed text-muted">
            Night watch. Authenticate to open the hangar ledger. What leaves the cage is written. What remains is
            counted.
          </p>
          <form onSubmit={onSubmit} className="space-y-5">
            <label className="block text-xs uppercase tracking-[0.18em] text-muted">
              Callsign
              <input
                className={`mt-1 ${fieldClass}`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label className="block text-xs uppercase tracking-[0.18em] text-muted">
              Passphrase
              <div className="relative mt-1">
                <input
                  type={show ? "text" : "password"}
                  className={`${fieldClass} pr-16`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-2 -translate-y-1/2 min-h-11 px-2 text-[10px] uppercase tracking-widest text-sand hover:text-brass"
                  onClick={() => setShow((v) => !v)}
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            {error && (
              <div role="alert" className="border border-danger/50 bg-danger/15 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}
            <button type="submit" disabled={busy} className={`${primaryBtn} w-full`}>
              {busy ? "Checking credentials" : "Authenticate"}
            </button>
          </form>
          <div className="mt-8 flex justify-between gap-4 mono text-[10px] uppercase tracking-[0.18em] text-muted">
            <span>Crypto green</span>
            <span>Link up</span>
            <span>Apron 04</span>
          </div>
        </div>
      </div>
      <div className="relative z-10 hidden flex-1 flex-col items-end justify-between p-10 lg:flex">
        <div className="watermark">{BRAND.name}</div>
        <p className="max-w-xs text-right text-sm leading-relaxed text-sand/90">
          Last light on the apron. Sodium floods. The ledger does not forget a round.
        </p>
      </div>
    </div>
  );
}
