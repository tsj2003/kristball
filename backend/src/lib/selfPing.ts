const INTERVAL_MS = 5 * 60 * 1000;

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function toHealthUrl(raw: string): string | null {
  const value = trimSlash(raw.trim());
  if (!value) return null;
  if (/localhost|127\.0\.0\.1/i.test(value)) return null;
  if (/\/api\/health$/i.test(value) || /\/health$/i.test(value)) return value;
  return `${value}/api/health`;
}

function collectTargets(): string[] {
  const found: string[] = [];
  const push = (raw?: string) => {
    if (!raw) return;
    for (const piece of raw.split(/[\s,]+/)) {
      const url = toHealthUrl(piece);
      if (url) found.push(url);
    }
  };

  push(process.env.KEEP_AWAKE_URL);
  push(process.env.KEEP_AWAKE_URLS);
  push(process.env.RENDER_EXTERNAL_URL);
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
  }

  return [...new Set(found)];
}

function hit(url: string) {
  fetch(url, { method: "GET", redirect: "follow" }).catch(() => undefined);
}

export function startSelfPing() {
  if (typeof fetch !== "function") return;
  const targets = collectTargets();
  if (targets.length === 0) return;

  const tick = () => {
    for (const url of targets) hit(url);
  };

  tick();
  setInterval(tick, INTERVAL_MS);
}
