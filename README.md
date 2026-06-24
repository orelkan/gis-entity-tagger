# GIS Text Tagger

Ingest GIS entities from heterogeneous sources, automatically tag them with Google Place types using an LLM pipeline, and review results in a web UI with map and feedback.

## Stack

- **Backend:** Python 3.11+, FastAPI, SQLite, SQLAlchemy
- **Frontend:** React 18, TypeScript, Vite, Leaflet
- **LLM:** OpenAI (configurable; mock mode when no API key)

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # optional: set OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

### Seed sample data

```bash
python scripts/seed.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — the UI proxies API requests to port 8000.

## Project layout

```
backend/     FastAPI app, adapters, LLM tagging pipeline
frontend/    React + TypeScript review UI with map
data/        Sample GIS datasets (multiple schemas)
scripts/     Seed and utility scripts
docs/        Architecture notes
```
