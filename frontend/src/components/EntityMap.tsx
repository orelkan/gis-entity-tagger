import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import type { Geometry } from '../types'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons in bundlers
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png'
import icon from 'leaflet/dist/images/marker-icon.png'
import shadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: shadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

function getLatLng(geometry: Geometry | null): [number, number] | null {
  if (!geometry || geometry.type !== 'Point') return null
  const coords = geometry.coordinates as number[]
  if (coords.length < 2) return null
  return [coords[1], coords[0]]
}

interface EntityMapProps {
  geometry: Geometry | null
  name: string
  predictedType?: string | null
  height?: string
}

export function EntityMap({ geometry, name, predictedType, height = '280px' }: EntityMapProps) {
  const latLng = getLatLng(geometry)

  if (!latLng) {
    return (
      <div className="map-placeholder" style={{ height }}>
        No point geometry available for this entity.
      </div>
    )
  }

  return (
    <div className="map-container" style={{ height }}>
      <MapContainer center={latLng} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={latLng}>
          <Popup>
            <strong>{name}</strong>
            {predictedType && <div>Type: {predictedType}</div>}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
