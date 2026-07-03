#!/usr/bin/env python3
"""Regenerate lib/data/kaarakaTags.ts from utlils/short_names_tags.csv.

Run from the repo root:
    python3 scripts/generateKaarakaTags.py
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = REPO_ROOT / "utlils" / "short_names_tags.csv"
OUT_PATH = REPO_ROOT / "lib" / "data" / "kaarakaTags.ts"


def main() -> None:
    rows: list[dict[str, str]] = []
    with CSV_PATH.open("r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader, None)  # skip header
        for row in reader:
            if len(row) < 2:
                continue
            long_name = row[0].strip()
            short_name = row[1].strip()
            if not long_name or not short_name:
                continue
            rows.append({"long": long_name, "short": short_name})

    body = json.dumps(rows, ensure_ascii=False, indent=2)
    out = (
        "// Auto-generated from utlils/short_names_tags.csv. Do not edit by hand.\n"
        "// Regenerate with: python3 scripts/generateKaarakaTags.py\n\n"
        "export interface KaarakaTag {\n"
        "\tlong: string;\n"
        "\tshort: string;\n"
        "}\n\n"
        f"export const KAARAKA_TAGS: KaarakaTag[] = {body};\n"
    )
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(out, encoding="utf-8")
    print(f"Wrote {len(rows)} tags to {OUT_PATH.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
