'use client'

import { useState, useCallback, useRef } from 'react'
import Map, { Marker, Popup, NavigationControl, type MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Photo, Trip } from '@/types'
import { X } from 'lucide-react'

interface MapViewProps {
  photos: Photo[]
  trips: Trip[]
}

export default function MapView({ photos, trips }: MapViewProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [activeTrip, setActiveTrip] = useState<string>('all')
  const mapRef = useRef<MapRef>(null)

  const visiblePhotos = photos.filter(
    (p) => p.lat && p.lng && (activeTrip === 'all' || p.trip_id === activeTrip)
  )

  const handleMarkerClick = useCallback((photo: Photo) => {
    setSelectedPhoto(photo)
  }, [])

  function handleMapLoad() {
    const map = mapRef.current?.getMap()
    if (!map) return

    // 遍历所有 symbol 图层，将含 text-field 的图层切换为中文优先
    // （按图层名指定容易遗漏 Mapbox 样式中的隐藏图层，全量遍历更可靠）
    const zhField = ['coalesce', ['get', 'name_zh-Hans'], ['get', 'name']]
    for (const layer of map.getStyle().layers) {
      if (layer.type !== 'symbol') continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(layer as any).layout?.['text-field']) continue
      try {
        map.setLayoutProperty(layer.id, 'text-field', zhField)
      } catch { /* 跳过不支持该表达式的图层 */ }
    }

    // 从 country-label 中隐藏台湾，改为省级显示
    if (map.getLayer('country-label')) {
      const existing = map.getFilter('country-label')
      map.setFilter('country-label', [
        'all',
        ...(existing ? [existing] : []),
        ['!=', ['get', 'name_en'], 'Taiwan'],
      ])
    }

    // 台湾下辖城市字体降级（symbolrank 因 Mapbox 将台湾视为"国家"而偏高）
    if (map.getLayer('settlement-label')) {
      map.setLayoutProperty('settlement-label', 'text-size', [
        'interpolate', ['linear'], ['zoom'],
        4,  ['case', ['==', ['get', 'iso_3166_1'], 'TW'], 8,  10],
        8,  ['case', ['==', ['get', 'iso_3166_1'], 'TW'], 11, 14],
        14, ['case', ['==', ['get', 'iso_3166_1'], 'TW'], 13, 16],
      ])
    }
  }

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{ longitude: 116.4, latitude: 39.9, zoom: 4 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        onClick={() => setSelectedPhoto(null)}
        onLoad={handleMapLoad}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {visiblePhotos.map((photo) => (
          <Marker
            key={photo.id}
            longitude={photo.lng!}
            latitude={photo.lat!}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation()
              handleMarkerClick(photo)
            }}
          >
            <div className="photo-marker group">
              <div
                className="w-12 h-12 rounded-full border-2 border-white shadow-md overflow-hidden
                           ring-2 ring-transparent group-hover:ring-primary-400 transition-all"
              >
                <img
                  src={photo.thumbnail_url || (/\.(heic|heif)$/i.test(photo.url) ? `/api/photos/${photo.id}/jpeg?size=thumb` : photo.url)}
                  alt={photo.title || ''}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border border-stone-300 rotate-45 shadow-sm" />
            </div>
          </Marker>
        ))}

        {selectedPhoto && selectedPhoto.lat && selectedPhoto.lng && (
          <Popup
            longitude={selectedPhoto.lng}
            latitude={selectedPhoto.lat}
            anchor="top"
            closeButton={false}
            className="photo-popup"
            maxWidth="260px"
            onClose={() => setSelectedPhoto(null)}
          >
            <div className="bg-white rounded-xl overflow-hidden shadow-lg w-60">
              <div className="relative">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.title || ''}
                  className="w-full h-40 object-cover"
                />
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-3">
                {selectedPhoto.title && (
                  <p className="font-medium text-stone-800 text-sm truncate">{selectedPhoto.title}</p>
                )}
                {selectedPhoto.location_name && (
                  <p className="text-xs text-stone-500 mt-0.5 truncate">📍 {selectedPhoto.location_name}</p>
                )}
                {selectedPhoto.taken_at && (
                  <p className="text-xs text-stone-400 mt-0.5">
                    {new Date(selectedPhoto.taken_at).toLocaleDateString('zh-CN')}
                  </p>
                )}
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* 行程筛选器 */}
      <div className="absolute top-4 left-4 right-4 md:right-auto md:max-w-xs flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTrip('all')}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium shadow-sm transition-colors ${
            activeTrip === 'all'
              ? 'bg-primary-500 text-white'
              : 'bg-white text-stone-700 hover:bg-stone-50'
          }`}
        >
          全部
        </button>
        {trips.map((trip) => (
          <button
            key={trip.id}
            onClick={() => setActiveTrip(trip.id)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium shadow-sm transition-colors ${
              activeTrip === trip.id
                ? 'bg-primary-500 text-white'
                : 'bg-white text-stone-700 hover:bg-stone-50'
            }`}
          >
            {trip.name}
          </button>
        ))}
      </div>
    </div>
  )
}
