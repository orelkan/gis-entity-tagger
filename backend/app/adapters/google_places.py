from typing import Any

from app.adapters.base import build_text_context
from app.schemas import EntityCreate, Geometry, NormalizedEntity


class GooglePlacesCsvAdapter:
    source_name = "google_places_csv"

    def parse(self, record: dict[str, Any]) -> EntityCreate:
        name = record.get("name", "Unknown")
        types = record.get("types", [])
        if isinstance(types, str):
            types = [t.strip() for t in types.split("|") if t.strip()]

        lat = record.get("latitude")
        lng = record.get("longitude")
        geometry = None
        if lat is not None and lng is not None:
            geometry = Geometry(type="Point", coordinates=[float(lng), float(lat)])

        attributes = {
            "types": types,
            "formatted_address": record.get("formatted_address"),
            "business_status": record.get("business_status"),
        }

        return EntityCreate(
            source=self.source_name,
            raw=record,
            normalized=NormalizedEntity(
                name=name,
                geometry=geometry,
                attributes=attributes,
                text_context=build_text_context(
                    name,
                    {k: v for k, v in attributes.items() if k != "types"},
                    extra=[f"types={','.join(types)}"] if types else None,
                ),
            ),
        )
