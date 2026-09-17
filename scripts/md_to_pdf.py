#!/usr/bin/env python3
"""Minimal stdlib PDF writer for the Kristallball documentation report."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs" / "Kristallball-Documentation.md"
OUT = ROOT / "docs" / "Kristallball-Documentation.pdf"


def escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def wrap(line: str, width: int = 92) -> list[str]:
    if not line:
        return [""]
    words = line.replace("\t", "    ").split(" ")
    rows: list[str] = []
    current = ""
    for word in words:
        trial = word if not current else f"{current} {word}"
        if len(trial) <= width:
            current = trial
        else:
            if current:
                rows.append(current)
            current = word
    if current:
        rows.append(current)
    return rows or [""]


def main() -> None:
    raw = SRC.read_text(encoding="utf-8")
    lines: list[str] = []
    for line in raw.splitlines():
        lines.extend(wrap(line.rstrip()))

    page_h = 792
    page_w = 612
    margin = 48
    leading = 12
    rows_per_page = int((page_h - 2 * margin) / leading)
    pages = [lines[i : i + rows_per_page] for i in range(0, len(lines), rows_per_page)] or [[]]

    objects: list[bytes] = []

    def add(obj: str) -> None:
        objects.append(obj.encode("latin-1", "replace"))

    n = len(pages)
    page_obj_start = 3
    content_obj_start = 3 + n
    font_id = content_obj_start + n
    kids = " ".join(f"{page_obj_start + i} 0 R" for i in range(n))

    add("<< /Type /Catalog /Pages 2 0 R >>")
    add(f"<< /Type /Pages /Count {n} /Kids [{kids}] /MediaBox [0 0 {page_w} {page_h}] >>")

    content_streams: list[str] = []
    for page in pages:
        y = page_h - margin
        stream_lines = ["BT", "/F1 10 Tf", f"{leading} TL", f"{margin} {y} Td"]
        for row in page:
            stream_lines.append(f"({escape(row)}) Tj T*")
        stream_lines.append("ET")
        content_streams.append("\n".join(stream_lines))

    for i in range(n):
        add(
            f"<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 {font_id} 0 R >> >> "
            f"/Contents {content_obj_start + i} 0 R >>"
        )
    for stream in content_streams:
        add(f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream")
    add("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>")

    assembled = b"%PDF-1.4\n"
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(assembled))
        assembled += f"{i} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref_start = len(assembled)
    xref = f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n"
    xref += "".join(f"{off:010d} 00000 n \n" for off in offsets[1:])
    trailer = f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n"
    OUT.write_bytes(assembled + xref.encode() + trailer.encode())
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes, {n} pages)")


if __name__ == "__main__":
    main()
