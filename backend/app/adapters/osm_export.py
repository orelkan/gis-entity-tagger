from typing import Any

from app.adapters.base import build_text_context
from app.schemas import EntityCreate, Geometry, NormalizedEntity


class OsmExportAdapter:
    source_name = "osm_export"

    def parse(self, record: dict[str, Any]) -> EntityCreate:
        tags = record.get("tags", {})
        name = tags.get("name") or tags.get("amenity") or tags.get("shop") or "Unknown"

        geometry = None
        if "lon" in record and "lat" in record:
            geometry = Geometry(type="Point", coordinates=[float(record["lon"]), float(record["lat"])])
        elif record.get("geometry"):
            geom = record["geometry"]
            geometry = Geometry(type=geom["type"], coordinates=geom["coordinates"])

        attributes = dict(tags)

        return EntityCreate(
            source=self.source_name,
            raw=record,
            normalized=NormalizedEntity(
                name=name,
                geometry=geometry,
                attributes=attributes,
                text_context=build_text_context(name, attributes),
            ),
        )
