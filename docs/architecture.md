# Architecture

## Data flow

1. **Ingest** — Raw records arrive from source-specific adapters (CSV, GeoJSON, JSON).
2. **Normalize** — Each record becomes a canonical `Entity` with `raw`, `normalized`, and optional `tagging`.
3. **Tag** — LLM pipeline maps normalized text to a Google Place type.
4. **Review** — React UI shows original data, prediction, and map; user submits feedback.

## Canonical entity

| Field | Purpose |
|-------|---------|
| `source` | Origin schema identifier |
| `raw` | Original record unchanged |
| `normalized` | Name, geometry, attributes, text context for LLM |
| `tagging` | Predicted Google type, confidence, alternatives, reasoning |
| `feedback` | User correction (correct / corrected type) |

## Tagging standard (v1)

Google Place Types — e.g. `restaurant`, `park`, `hospital`, `supermarket`.

The LLM receives entity context and a curated subset of valid types, and returns structured JSON.

## Future

- Additional standards (OSM tags)
- Live scrapers and API connectors
- Feedback-driven prompt improvement
