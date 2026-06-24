from typing import Any

from app.adapters.base import build_text_context
from app.schemas import EntityCreate, Geometry, NormalizedEntity

LAND_USE_MAP = {
    "101": "park",
    "102": "school",
    "103": "hospital",
    "104": "retail",
    "105": "restaurant",
    "106": "parking",
}


class MunicipalGisAdapter:
    source_name = "municipal_gis"

    def parse(self, record: dict[str, Any]) -> EntityCreate:
        props = record.get("properties", record)
        name = props.get("FACILITY_NAME") or props.get("name") or "Unknown"
        land_use = str(props.get("LAND_USE_CODE", ""))
        facility_type = props.get("FACILITY_TYPE", LAND_USE_MAP.get(land_use, land_use))

        geometry = None
        geom = record.get("geometry")
        if geom:
            geometry = Geometry(type=geom["type"], coordinates=geom["coordinates"])

        attributes = {
            "LAND_USE_CODE": land_use,
            "FACILITY_TYPE": facility_type,
            "ADDRESS": props.get("ADDRESS"),
            "ZONE": props.get("ZONE"),
        }

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
