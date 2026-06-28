---
name: run-gis-entity-tagger
description: Build, run, and screenshot gis-entity-tagger. Use when asked to start the app, run it, take a screenshot of the UI, check the entities map, or interact with the running backend or frontend.
---

Full-stack web app: FastAPI backend on :8000 + Vite/React frontend on :5173. Drive it via `google-chrome --headless=new` for screenshots, or `curl` for the backend API. No separate driver file needed.

## Prerequisites

```bash
# Python (backend)
python3 -m venv backend/.venv
pip install -r backend/requirements.txt   # inside venv

# Node (frontend)
cd frontend && npm install
```

No system packages beyond Python 3 and Node are required. `google-chrome` must be available for screenshots (already present on this machine).

## Setup

```bash
# backend/.env — copy and edit
cp backend/.env.example backend/.env   # if example exists, else create it
# Set LLM_PROVIDER=mock to skip needing an OpenAI key:
echo "LLM_PROVIDER=mock" >> backend/.env
```

Environment variables:

```bash
LLM_PROVIDER=mock        # optional — skips OpenAI, uses heuristic tagger
OPENAI_API_KEY=sk-...    # required only when LLM_PROVIDER != mock
```

## Run (agent path)

Always ensure exactly one instance of each process is running. Kill any existing instance before starting a new one — this avoids port conflicts and stale state.

### 1. Start (or restart) the backend

```bash
kill $(lsof -ti:8000) 2>/dev/null; sleep 0.3
cd /home/orel/Documents/projects/gis-entity-tagger/backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000 &> /tmp/backend.log &
timeout 15 bash -c 'until curl -sf http://localhost:8000/entities/stats/summary > /dev/null; do sleep 0.5; done'
```

### 2. Start (or restart) the frontend

```bash
kill $(lsof -ti:5173) $(lsof -ti:5174) 2>/dev/null; sleep 0.3
cd /home/orel/Documents/projects/gis-entity-tagger/frontend
npm run dev &> /tmp/frontend.log &
timeout 20 bash -c 'until grep -q "Local:" /tmp/frontend.log 2>/dev/null; do sleep 0.3; done'
```

Frontend is always on :5173 when started this way (prior instances are killed first).

### 3. Seed sample data (first run)

```bash
curl -s -X POST http://localhost:8000/entities/ingest/samples | python3 -m json.tool
```

### 4. Screenshots

```bash
google-chrome --headless=new --no-sandbox --disable-gpu \
  --screenshot=/tmp/dashboard.png --window-size=1280,800 \
  --virtual-time-budget=5000 \
  http://localhost:5173/

google-chrome --headless=new --no-sandbox --disable-gpu \
  --screenshot=/tmp/entities.png --window-size=1280,800 \
  --virtual-time-budget=8000 \
  http://localhost:5173/entities
```

`--virtual-time-budget=8000` (ms) is needed for the Leaflet map tiles to load from CartoDB; 5000 is enough for text-only pages.

Screenshots land at the path you specify — use `/tmp/` or the session scratchpad.

### 5. API smoke tests

```bash
# Stats
curl -s http://localhost:8000/entities/stats/summary | python3 -m json.tool

# Entity list (with geometry for map markers)
curl -s "http://localhost:8000/entities?page=1&page_size=5" | python3 -m json.tool

# Single entity detail
ID=$(curl -s "http://localhost:8000/entities?page=1&page_size=1" | python3 -c "import sys,json; print(json.load(sys.stdin)['items'][0]['id'])")
curl -s "http://localhost:8000/entities/$ID" | python3 -m json.tool
```

## Run (human path)

```bash
# Terminal 1
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
# open http://localhost:5173 in a browser
```

## Gotchas

- **`--virtual-time-budget` required for map tiles** — Without it, `google-chrome --headless` exits before the CartoDB tile network requests complete and the map renders as a blank gray area. Use 8000 ms for the `/entities` page, 5000 ms for Dashboard and Detail.

- **Backend must be up before the frontend matters** — The Vite dev proxy forwards `/api/*` to `http://127.0.0.1:8000`. If the backend is down, all fetch calls silently fail with network errors; the UI shows empty state rather than an error banner.

- **`dbind-WARNING` in Chrome output is harmless** — `Couldn't connect to accessibility bus` appears on headless Linux; ignore it.

- **SQLite is ephemeral if you delete the backend** — The DB lives at `backend/gis_tagger.db` (auto-created). Deleting it wipes all entities; re-run the seed endpoint.

## Troubleshooting

- **`[Errno 98] Address already in use` on port 8000**: `kill $(lsof -ti:8000)` then restart.
- **`ModuleNotFoundError` on backend startup**: venv not activated or `pip install -r requirements.txt` not run. Activate first: `source backend/.venv/bin/activate`.
- **Frontend shows "No entities found"**: Database is empty. POST to `/entities/ingest/samples` to seed.
- **Map shows no markers**: Entities lack `geometry` in the list response — check that `backend/app/services.py` includes `geometry=row.normalized.get("geometry")` in `EntitySummary` construction.
