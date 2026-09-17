import { useEffect, useState } from "react";

const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function MissionClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const dd = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  const mon = months[now.getUTCMonth()];
  const yy = String(now.getUTCFullYear()).slice(-2);
  const dtg = `${dd}${hh}${mm}Z ${mon} ${yy}`;

  return (
    <div className="mono text-right text-xs text-sand" aria-live="off">
      <div className="tracking-[0.16em] text-brass">
        {hh}:{mm}:{ss}Z
      </div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted">{dtg}</div>
    </div>
  );
}
