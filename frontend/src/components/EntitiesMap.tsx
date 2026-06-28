import { useEffect, useRef } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { EntitySummary } from '../types'

function getLatLng(entity: EntitySummary): [number, number] | null {
  if (!entity.geometry || entity.geometry.type !== 'Point') return null
  const coords = entity.geometry.coordinates as number[]
  if (coords.length < 2) return null
  return [coords[1], coords[0]]
}

function markerColor(entity: EntitySummary): string {
  if (!entity.has_feedback) return '#8b949e'
  return entity.feedback_correct ? '#3fb950' : '#e3b341'
}

function FlyTo({ selectedId, entities }: { selectedId: string | null; entities: EntitySummary[] }) {
  const map = useMap()
  useEffect(() => {
    if (!selectedId) return
    const entity = entities.find((e) => e.id === selectedId)
    if (!entity) return
    const latLng = getLatLng(entity)
    if (latLng) map.flyTo(latLng, Math.max(map.getZoom(), 14), { duration: 0.8 })
  }, [selectedId, entities, map])
  return null
}

function BoundsSync({ entities }: { entities: EntitySummary[] }) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current || entities.length === 0) return
    const points = entities.flatMap((e) => {
      const ll = getLatLng(e)
      return ll ? [ll] : []
    })
    if (points.length > 0) {
      map.fitBounds(points, { padding: [48, 48] })
      fitted.current = true
    }
  }, [entities, map])
  return null
}

interface EntitiesMapProps {
  entities: EntitySummary[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function EntitiesMap({ entities, selectedId, onSelect }: EntitiesMapProps) {
  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <BoundsSync entities={entities} />
      <FlyTo selectedId={selectedId} entities={entities} />
      {entities.map((entity) => {
        const latLng = getLatLng(entity)
        if (!latLng) return null
        const isSelected = entity.id === selectedId
        const color = markerColor(entity)
        return (
          <CircleMarker
            key={entity.id}
            center={latLng}
            radius={isSelected ? 10 : 7}
            pathOptions={{
              color: isSelected ? '#fff' : color,
              fillColor: color,
              fillOpacity: 0.9,
              weight: isSelected ? 2 : 1,
            }}
            eventHandlers={{ click: () => onSelect(entity.id) }}
          >
            <Popup>
              <strong>{entity.name}</strong>
              {entity.predicted_type && <div>Type: {entity.predicted_type}</div>}
              {entity.confidence != null && (
                <div>Confidence: {Math.round(entity.confidence * 100)}%</div>
              )}
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
