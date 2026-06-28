import { LayersControl, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import type { Geometry } from '../types'
import 'leaflet/dist/leaflet.css'

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

const TILES = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP',
  },
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
}

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
      <MapContainer
        center={latLng}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Dark">
            <TileLayer url={TILES.dark.url} attribution={TILES.dark.attribution} />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer url={TILES.satellite.url} attribution={TILES.satellite.attribution} />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Street">
            <TileLayer url={TILES.street.url} attribution={TILES.street.attribution} />
          </LayersControl.BaseLayer>
        </LayersControl>
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
