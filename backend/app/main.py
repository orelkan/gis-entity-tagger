from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.entities import ingest_samples as _ingest_samples
from app.api.entities import router as entities_router
from app.config import settings
from app.database import EntityModel, SessionLocal, init_db

DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


def _auto_seed() -> None:
    db = SessionLocal()
    try:
        if db.query(EntityModel).count() == 0:
            _ingest_samples(db)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    _auto_seed()
    yield


app = FastAPI(title="GIS Text Tagger", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(entities_router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}


# Serve the built React app — only active when frontend/dist exists
if DIST.exists():
    if (DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(DIST / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        fp = DIST / full_path
        if fp.is_file():
            return FileResponse(str(fp))
        return FileResponse(str(DIST / "index.html"))
