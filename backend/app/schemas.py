from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class Geometry(BaseModel):
    type: str
    coordinates: list[float] | list[list[float]] | list[list[list[float]]]


class NormalizedEntity(BaseModel):
    name: str
    geometry: Geometry | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)
    text_context: str


class TaggingResult(BaseModel):
    standard: str = "google"
    predicted_type: str
    confidence: float = Field(ge=0.0, le=1.0)
    alternatives: list[str] = Field(default_factory=list)
    reasoning: str = ""


class FeedbackCreate(BaseModel):
    correct: bool
    corrected_type: str | None = None
    comment: str | None = None


class Feedback(BaseModel):
    correct: bool
    corrected_type: str | None = None
    comment: str | None = None
    created_at: datetime


class EntityCreate(BaseModel):
    source: str
    raw: dict[str, Any]
    normalized: NormalizedEntity


class EntitySummary(BaseModel):
    id: UUID
    source: str
    name: str
    predicted_type: str | None = None
    confidence: float | None = None
    has_feedback: bool = False
    feedback_correct: bool | None = None


class EntityDetail(BaseModel):
    id: UUID
    source: str
    raw: dict[str, Any]
    normalized: NormalizedEntity
    tagging: TaggingResult | None = None
    feedback: Feedback | None = None
    created_at: datetime
    updated_at: datetime


class EntityListResponse(BaseModel):
    items: list[EntitySummary]
    total: int
    page: int
    page_size: int


class StatsResponse(BaseModel):
    total_entities: int
    tagged_entities: int
    with_feedback: int
    correct_feedback: int
    incorrect_feedback: int


class IngestResponse(BaseModel):
    ingested: int
    tagged: int
