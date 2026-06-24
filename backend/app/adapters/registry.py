from typing import Any

from app.adapters.google_places import GooglePlacesCsvAdapter
from app.adapters.municipal_gis import MunicipalGisAdapter
from app.adapters.osm_export import OsmExportAdapter
from app.schemas import EntityCreate

ADAPTERS = {
    "google_places_csv": GooglePlacesCsvAdapter(),
    "osm_export": OsmExportAdapter(),
    "municipal_gis": MunicipalGisAdapter(),
}


def parse_record(source: str, record: dict[str, Any]) -> EntityCreate:
    adapter = ADAPTERS.get(source)
    if adapter is None:
        raise ValueError(f"Unknown source: {source}")
    return adapter.parse(record)
