# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend
```bash
cd backend
source .venv/bin/activate          # activate venv (create with: python -m venv .venv && pip install -r requirements.txt)
uvicorn app.main:app --reload --port 8000
```

Set `LLM_PROVIDER=mock` in `backend/.env` to run without an OpenAI API key — the mock provider uses heuristics instead.

### Frontend
```bash
cd frontend
npm install
npm run dev       # starts Vite on :5173 (or next available port)
npm run build     # runs tsc -b then vite build — use this to type-check
```

### Seed data
```bash
# with backend running:
python scripts/seed.py
# or directly via API:
curl -X POST http://localhost:8000/entities/ingest/samples
```

## Architecture

### Data flow
Raw GIS records → **adapter** (normalize) → **SQLite** (`EntityModel`) → **LLM tagging pipeline** → **React UI** (review + feedback)

### Backend (`backend/app/`)

**`database.py`** — Single `EntityModel` table. `raw`, `normalized`, and `tagging` are JSON columns (not relational). `normalized` stores `{name, geometry, attributes, text_context}`. `tagging` stores `{predicted_type, confidence, alternatives, reasoning}`. No migrations — `init_db()` calls `create_all` on startup.

**`adapters/`** — One adapter per source schema, all implementing the `SourceAdapter` protocol (`base.py`). Each adapter's `parse()` method converts a raw record into `EntityCreate` with a `NormalizedEntity`. To add a new source: create adapter, register it in `registry.py`'s `ADAPTERS` dict.

**`tagging/pipeline.py`** — `TaggingProvider` ABC with two implementations: `OpenAITaggingProvider` (structured JSON output via `response_format`) and `MockTaggingProvider` (rule-based heuristics using OSM hints and name patterns). `get_tagging_provider()` returns mock when `OPENAI_API_KEY` is absent or `LLM_PROVIDER=mock`.

**`services.py`** — Pure DB operations layer. The router calls services; services never import from `api/`. `list_entities` builds `EntitySummary` objects by reading `row.normalized` and `row.tagging` dicts directly.

**`api/entities.py`** — Single router mounted at `/entities`. Handles ingest, list, get, retag, feedback, stats, and sample loading.

### Frontend (`frontend/src/`)

Vite proxies all `/api/*` requests to `http://127.0.0.1:8000`, stripping the `/api` prefix (configured in `vite.config.ts`). All fetch calls in `api.ts` use `/api` as base.

**`types.ts`** — Single source of truth for TypeScript interfaces; must be kept in sync with `backend/app/schemas.py` by hand.

**Pages:**
- `DashboardPage` — stats overview + "Load sample data" button
- `EntityListPage` — full-height sidebar (340px, filters + entity list + detail card) + `EntitiesMap` filling remaining width
- `EntityDetailPage` — `EntityMap` (single marker) + tagging details + feedback form

**Components:**
- `EntitiesMap` — multi-entity Leaflet map with circle markers (gray=pending, green=correct, amber=corrected), auto-fits bounds, flies to selected entity
- `EntityMap` — single-entity marker map, used on detail page
- Both maps use **CartoDB Dark Matter** tiles (no API key required)

**CSS** — Dark theme via CSS custom properties in `App.css` (variables: `--bg`, `--surface`, `--surface-2`, `--border`, `--text`, `--text-muted`, `--accent`). The `.app-main` is a flex column with no padding; `.page` adds padding for Dashboard/Detail; `.entities-shell` goes full-height for the map layout.
