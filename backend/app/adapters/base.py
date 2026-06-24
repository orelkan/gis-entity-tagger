from typing import Any, Protocol

from app.schemas import EntityCreate, NormalizedEntity


class SourceAdapter(Protocol):
    source_name: str

    def parse(self, record: dict[str, Any]) -> EntityCreate: ...


def build_text_context(name: str, attributes: dict[str, Any], extra: list[str] | None = None) -> str:
    parts = [name]
    for key, value in attributes.items():
        if value is not None and value != "":
            parts.append(f"{key}={value}")
    if extra:
        parts.extend(extra)
    return ", ".join(parts)
