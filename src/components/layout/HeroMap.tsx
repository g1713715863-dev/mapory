'use client'

import Map, { Marker } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'

interface HeroMapProps {
  photos: { lat: number; lng: number }[]
}

export default function HeroMap({ photos }: HeroMapProps) {
  return (
    <Map
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      initialViewState={{ longitude: 105, latitude: 35, zoom: 3 }}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      interactive={false}
      attributionControl={false}
    >
      {photos.map((p, i) => (
        <Marker key={i} longitude={p.lng} latitude={p.lat}>
          <div className="w-2.5 h-2.5 rounded-full bg-primary-400/70 border-2 border-white shadow-sm" />
        </Marker>
      ))}
    </Map>
  )
}
