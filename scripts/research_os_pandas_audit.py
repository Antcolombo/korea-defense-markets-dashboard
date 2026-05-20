#!/usr/bin/env python3
"""Pandas audit for Research OS generated datasets.

This is intentionally separate from the production build gate, which stays in
TypeScript. The point is to expose a recruiter-relevant Python/pandas analytics
layer without making local Next.js builds depend on a Python environment.
"""

from __future__ import annotations

import json
from pathlib import Path

try:
    import pandas as pd
except ImportError as exc:  # pragma: no cover - user environment guard
    raise SystemExit(
        "pandas is not installed. Run `python3 -m pip install -r requirements.txt` "
        "or use a virtual environment before running this script."
    ) from exc


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "src" / "generated"


DATASETS = {
    "marketTape": "marketTape.json",
    "companyCoverage": "companyCoverage.json",
    "eventTape": "eventTape.json",
    "ideaLedger": "ideaLedger.json",
    "researchArtifacts": "researchArtifacts.json",
    "masteryPipeline": "masteryPipeline.json",
}


def load_frame(name: str, filename: str) -> pd.DataFrame:
    path = GENERATED / filename
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, list):
        raise ValueError(f"{name}: expected array root in {path}")
    frame = pd.json_normalize(payload)
    if frame.empty:
        raise ValueError(f"{name}: dataset is empty")
    return frame


def main() -> None:
    frames = {name: load_frame(name, filename) for name, filename in DATASETS.items()}
    summary = pd.DataFrame(
        [
            {
                "dataset": name,
                "rows": len(frame),
                "columns": len(frame.columns),
                "missing_cells": int(frame.isna().sum().sum()),
            }
            for name, frame in frames.items()
        ]
    )
    print(summary.to_string(index=False))

    ideas = frames["ideaLedger"]
    print("\nIdea statuses")
    print(ideas["status"].value_counts().to_string())

    companies = frames["companyCoverage"]
    print("\nCompany coverage by country")
    print(companies["country"].value_counts().to_string())


if __name__ == "__main__":
    main()
