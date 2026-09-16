import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { user, login, error } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md border border-line bg-panel/90 p-8 shadow-[0_0_80px_rgba(0,0,0,0.35)]">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center border border-brass/60">
            <Shield className="h-6 w-6 text-brass" />
          </div>
          <div>
            <div className="display text-2xl text-brass">Kristallball</div>
            <div className="text-xs uppercase tracking-[0.22em] text-muted">Restricted access</div>
          </div>
        </div>
        <p className="mb-6 text-sm text-muted">
          Sign in with your issued account to view base holdings, assignments, and movement ledgers.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-xs uppercase tracking-widest text-muted">
            Username
            <input
              className="mt-1 w-full border border-line bg-field px-3 py-2 text-sm text-ink outline-none focus:border-brass"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="block text-xs uppercase tracking-widest text-muted">
            Password
            <input
              type="password"
              className="mt-1 w-full border border-line bg-field px-3 py-2 text-sm text-ink outline-none focus:border-brass"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <div className="border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
          <button
            type="submit"
            disabled={busy}
            className="display w-full bg-brass py-2 text-lg text-field disabled:opacity-60"
          >
            {busy ? "Checking credentials" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
