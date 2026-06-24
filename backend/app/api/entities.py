import json
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.adapters.registry import parse_record
from app.database import get_db
from app.schemas import EntityDetail, EntityListResponse, FeedbackCreate, IngestResponse, StatsResponse
from app.services import create_entity, get_entity, get_stats, list_entities, submit_feedback, tag_entity
from app.database import EntityModel

router = APIRouter(prefix="/entities", tags=["entities"])


@router.get("", response_model=EntityListResponse)
def get_entities(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    source: str | None = None,
    has_feedback: bool | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    return list_entities(
        db,
        page=page,
        page_size=page_size,
        source=source,
        has_feedback=has_feedback,
        search=search,
    )


@router.get("/stats/summary", response_model=StatsResponse)
def stats(db: Session = Depends(get_db)):
    return get_stats(db)


@router.get("/{entity_id}", response_model=EntityDetail)
def get_entity_by_id(entity_id: UUID, db: Session = Depends(get_db)):
    entity = get_entity(db, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return entity


@router.post("/{entity_id}/tag", response_model=EntityDetail)
def retag_entity(entity_id: UUID, db: Session = Depends(get_db)):
    row = db.get(EntityModel, str(entity_id))
    if not row:
        raise HTTPException(status_code=404, detail="Entity not found")
    tag_entity(db, row)
    return get_entity(db, entity_id)


@router.post("/{entity_id}/feedback", response_model=EntityDetail)
def post_feedback(entity_id: UUID, feedback: FeedbackCreate, db: Session = Depends(get_db)):
    try:
        entity = submit_feedback(db, entity_id, feedback)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return entity


from pydantic import BaseModel


class IngestBody(BaseModel):
    source: str
    records: list[dict]
    auto_tag: bool = True


@router.post("/ingest", response_model=IngestResponse)
def ingest_entities(body: IngestBody, db: Session = Depends(get_db)):
    ingested = 0
    tagged = 0
    for record in body.records:
        try:
            entity = parse_record(body.source, record)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        row = create_entity(db, entity, auto_tag=body.auto_tag)
        ingested += 1
        if row.tagging:
            tagged += 1
    return IngestResponse(ingested=ingested, tagged=tagged)


@router.post("/ingest/samples", response_model=IngestResponse)
def ingest_samples(db: Session = Depends(get_db)):
    """Load bundled sample datasets from data/samples/."""
    root = Path(__file__).resolve().parents[3] / "data" / "samples"
    total_ingested = 0
    total_tagged = 0

    datasets = [
        ("google_places_csv", root / "google_places.json"),
        ("osm_export", root / "osm_export.json"),
        ("municipal_gis", root / "municipal_gis.geojson"),
    ]

    for source, path in datasets:
        if not path.exists():
            continue
        data = json.loads(path.read_text())
        if source == "municipal_gis":
            records = data.get("features", [])
        else:
            records = data

        for record in records:
            entity = parse_record(source, record)
            row = create_entity(db, entity, auto_tag=True)
            total_ingested += 1
            if row.tagging:
                total_tagged += 1

    return IngestResponse(ingested=total_ingested, tagged=total_tagged)
