#!/usr/bin/env python3
"""Seed the database with sample GIS entities."""

import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
API_URL = "http://127.0.0.1:8000"


def main() -> int:
    try:
        response = httpx.post(f"{API_URL}/entities/ingest/samples", timeout=60.0)
        response.raise_for_status()
    except httpx.ConnectError:
        print("Error: backend not running. Start it with:", file=sys.stderr)
        print("  cd backend && uvicorn app.main:app --reload --port 8000", file=sys.stderr)
        return 1

    data = response.json()
    print(f"Ingested {data['ingested']} entities, tagged {data['tagged']}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
