#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/submission"
mkdir -p "$OUT"

zip -r "$OUT/kristallball-source.zip" . \
  -x "node_modules/*" \
  -x "*/node_modules/*" \
  -x ".git/*" \
  -x "dist/*" \
  -x "frontend/dist/*" \
  -x "backend/dist/*" \
  -x ".env" \
  -x "backend/.env" \
  -x "frontend/.env" \
  -x "submission/*" \
  -x "*.tsbuildinfo" \
  -x ".vite/*" \
  -x ".cursor/*" \
  -x ".cursor/*/*" \
  -x ".DS_Store"

if [[ -f "$ROOT/docs/schema.sql" ]]; then
  cp "$ROOT/docs/schema.sql" "$OUT/schema.sql"
fi
if docker inspect kristallball-postgres >/dev/null 2>&1; then
  docker exec kristallball-postgres pg_dump -U kristallball -d kristallball --inserts > "$OUT/dump.sql"
fi
if [[ -f "$ROOT/docs/Kristallball-Documentation.pdf" ]]; then
  cp "$ROOT/docs/Kristallball-Documentation.pdf" "$OUT/Kristallball-Documentation.pdf"
fi
if [[ -f "$ROOT/docs/Kristallball-Documentation.html" ]]; then
  cp "$ROOT/docs/Kristallball-Documentation.html" "$OUT/Kristallball-Documentation.html"
fi
if [[ -f "$ROOT/docs/Kristallball-Documentation.md" ]]; then
  cp "$ROOT/docs/Kristallball-Documentation.md" "$OUT/Kristallball-Documentation.md"
fi

echo "Wrote $OUT"
ls -lh "$OUT"
