from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.database import EntityModel
from app.schemas import (
    EntityCreate,
    EntityDetail,
    EntityListResponse,
    EntitySummary,
    Feedback,
    FeedbackCreate,
    StatsResponse,
    TaggingResult,
)
from app.tagging.pipeline import get_tagging_provider


def _to_detail(row: EntityModel) -> EntityDetail:
    feedback = None
    if row.feedback_correct is not None:
        feedback = Feedback(
            correct=row.feedback_correct,
            corrected_type=row.feedback_corrected_type,
            comment=row.feedback_comment,
            created_at=row.feedback_created_at or row.updated_at,
        )

    return EntityDetail(
        id=UUID(row.id),
        source=row.source,
        raw=row.raw,
        normalized=row.normalized,
        tagging=TaggingResult(**row.tagging) if row.tagging else None,
        feedback=feedback,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def create_entity(db: Session, entity: EntityCreate, auto_tag: bool = True) -> EntityModel:
    row = EntityModel(
        source=entity.source,
        raw=entity.raw,
        normalized=entity.normalized.model_dump(),
    )
    db.add(row)
    db.flush()

    if auto_tag:
        tag_entity(db, row)

    db.commit()
    db.refresh(row)
    return row


def tag_entity(db: Session, row: EntityModel) -> TaggingResult:
    from app.schemas import NormalizedEntity

    provider = get_tagging_provider()
    normalized = NormalizedEntity(**row.normalized)
    result = provider.tag(normalized)
    row.tagging = result.model_dump()
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return result


def list_entities(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    source: str | None = None,
    has_feedback: bool | None = None,
    search: str | None = None,
) -> EntityListResponse:
    query = db.query(EntityModel)

    if source:
        query = query.filter(EntityModel.source == source)
    if has_feedback is True:
        query = query.filter(EntityModel.feedback_correct.isnot(None))
    elif has_feedback is False:
        query = query.filter(EntityModel.feedback_correct.is_(None))
    if search:
        pattern = f"%{search.lower()}%"
        query = query.filter(EntityModel.normalized["name"].as_string().ilike(pattern))

    total = query.count()
    rows = (
        query.order_by(EntityModel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for row in rows:
        tagging = row.tagging or {}
        items.append(
            EntitySummary(
                id=UUID(row.id),
                source=row.source,
                name=row.normalized.get("name", "Unknown"),
                predicted_type=tagging.get("predicted_type"),
                confidence=tagging.get("confidence"),
                has_feedback=row.feedback_correct is not None,
                feedback_correct=row.feedback_correct,
            )
        )

    return EntityListResponse(items=items, total=total, page=page, page_size=page_size)


def get_entity(db: Session, entity_id: UUID) -> EntityDetail | None:
    row = db.get(EntityModel, str(entity_id))
    if not row:
        return None
    return _to_detail(row)


def submit_feedback(db: Session, entity_id: UUID, feedback: FeedbackCreate) -> EntityDetail | None:
    row = db.get(EntityModel, str(entity_id))
    if not row:
        return None

    if not feedback.correct and not feedback.corrected_type:
        raise ValueError("corrected_type is required when marking incorrect")

    row.feedback_correct = feedback.correct
    row.feedback_corrected_type = feedback.corrected_type
    row.feedback_comment = feedback.comment
    row.feedback_created_at = datetime.now(timezone.utc)
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return _to_detail(row)


def get_stats(db: Session) -> StatsResponse:
    total = db.query(EntityModel).count()
    tagged = db.query(EntityModel).filter(EntityModel.tagging.isnot(None)).count()
    with_feedback = db.query(EntityModel).filter(EntityModel.feedback_correct.isnot(None)).count()
    correct = db.query(EntityModel).filter(EntityModel.feedback_correct.is_(True)).count()
    incorrect = db.query(EntityModel).filter(EntityModel.feedback_correct.is_(False)).count()
    return StatsResponse(
        total_entities=total,
        tagged_entities=tagged,
        with_feedback=with_feedback,
        correct_feedback=correct,
        incorrect_feedback=incorrect,
    )
