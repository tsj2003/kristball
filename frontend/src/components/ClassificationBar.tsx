import { BRAND } from "../brand";

export function ClassificationBar() {
  return (
    <div className="class-tape relative z-20">
      <span className="live-dot" aria-hidden />
      {BRAND.classification}
      <span className="hidden sm:inline"> · {BRAND.unit}</span>
    </div>
  );
}
