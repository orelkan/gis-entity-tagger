import json
from abc import ABC, abstractmethod

from openai import OpenAI

from app.config import settings
from app.schemas import NormalizedEntity, TaggingResult
from app.tagging.google_types import GOOGLE_PLACE_TYPES, OSM_TO_GOOGLE_HINTS, PRIMARY_TYPES

SYSTEM_PROMPT = """You classify GIS map entities into Google Place types.

Return JSON with exactly these fields:
- predicted_type: one type from the allowed list (prefer primary place types like restaurant, park, hospital — not generic types like point_of_interest or establishment unless nothing else fits)
- confidence: float 0.0-1.0
- alternatives: array of up to 3 other valid types from the list
- reasoning: one short sentence explaining the choice

Use only types from the allowed list."""


def _build_user_prompt(entity: NormalizedEntity) -> str:
    types_list = ", ".join(sorted(GOOGLE_PLACE_TYPES))
    return f"""Entity context:
{entity.text_context}

Name: {entity.name}
Attributes: {json.dumps(entity.attributes, ensure_ascii=False)}

Allowed Google Place types:
{types_list}

Classify this entity."""


class TaggingProvider(ABC):
    @abstractmethod
    def tag(self, entity: NormalizedEntity) -> TaggingResult: ...


class MockTaggingProvider(TaggingProvider):
    """Rule-based fallback when no LLM API key is configured."""

    def tag(self, entity: NormalizedEntity) -> TaggingResult:
        attrs = entity.attributes
        name_lower = entity.name.lower()

        if types := attrs.get("types"):
            primary = next((t for t in types if t in PRIMARY_TYPES), types[0])
            return TaggingResult(
                standard="google",
                predicted_type=primary,
                confidence=0.75,
                alternatives=[t for t in types if t != primary][:3],
                reasoning="Mock: inferred from existing Google types in source data.",
            )

        for osm_key in ("amenity", "shop", "leisure", "building", "tourism"):
            if val := attrs.get(osm_key):
                predicted = OSM_TO_GOOGLE_HINTS.get(str(val), str(val))
                if predicted not in GOOGLE_PLACE_TYPES:
                    predicted = "point_of_interest"
                return TaggingResult(
                    standard="google",
                    predicted_type=predicted,
                    confidence=0.7,
                    alternatives=[],
                    reasoning=f"Mock: mapped OSM {osm_key}={val} to Google type.",
                )

        facility = attrs.get("FACILITY_TYPE", "")
        if facility:
            predicted = facility if facility in GOOGLE_PLACE_TYPES else "store"
            if facility == "retail":
                predicted = "store"
            return TaggingResult(
                standard="google",
                predicted_type=predicted,
                confidence=0.65,
                alternatives=[],
                reasoning="Mock: mapped municipal FACILITY_TYPE to Google type.",
            )

        if "park" in name_lower:
            predicted = "park"
        elif "school" in name_lower or "elementary" in name_lower:
            predicted = "school"
        elif "hospital" in name_lower or "medical" in name_lower:
            predicted = "hospital"
        elif "parking" in name_lower or "garage" in name_lower:
            predicted = "parking"
        elif "cafe" in name_lower or "coffee" in name_lower:
            predicted = "cafe"
        elif "restaurant" in name_lower or "grill" in name_lower or "pizza" in name_lower:
            predicted = "restaurant"
        elif "market" in name_lower or "grocery" in name_lower:
            predicted = "supermarket"
        elif "library" in name_lower:
            predicted = "library"
        else:
            predicted = "point_of_interest"

        return TaggingResult(
            standard="google",
            predicted_type=predicted,
            confidence=0.5,
            alternatives=[],
            reasoning="Mock: inferred from name and attributes heuristics.",
        )


class OpenAITaggingProvider(TaggingProvider):
    def __init__(self) -> None:
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model

    def tag(self, entity: NormalizedEntity) -> TaggingResult:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _build_user_prompt(entity)},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        content = response.choices[0].message.content or "{}"
        data = json.loads(content)

        predicted = str(data.get("predicted_type", "point_of_interest"))
        if predicted not in GOOGLE_PLACE_TYPES:
            predicted = "point_of_interest"

        alternatives = [t for t in data.get("alternatives", []) if t in GOOGLE_PLACE_TYPES and t != predicted][:3]

        return TaggingResult(
            standard="google",
            predicted_type=predicted,
            confidence=min(1.0, max(0.0, float(data.get("confidence", 0.5)))),
            alternatives=alternatives,
            reasoning=str(data.get("reasoning", "")),
        )


def get_tagging_provider() -> TaggingProvider:
    if settings.llm_provider == "mock" or not settings.openai_api_key:
        return MockTaggingProvider()
    return OpenAITaggingProvider()
