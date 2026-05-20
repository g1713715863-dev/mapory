'use client'

import { useState, useRef, useMemo } from 'react'
import Map, { Marker, Popup, NavigationControl, type MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Photo, Trip } from '@/types'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface MapViewProps {
  photos: Photo[]
  trips: Trip[]
}

type PhotoGroup = { lat: number; lng: number; photos: Photo[] }

function thumbSrc(photo: Photo) {
  if (photo.thumbnail_url) return photo.thumbnail_url
  if (/\.(heic|heif)$/i.test(photo.url)) return `/api/photos/${photo.id}/jpeg?size=thumb`
  return photo.url
}

function fullSrc(photo: Photo) {
  if (/\.(heic|heif)$/i.test(photo.url)) return `/api/photos/${photo.id}/jpeg`
  return photo.url
}

export default function MapView({ photos, trips }: MapViewProps) {
  const [selectedGroup, setSelectedGroup] = useState<PhotoGroup | null>(null)
  const [groupIdx, setGroupIdx] = useState(0)
  const [activeTrip, setActiveTrip] = useState<string>('all')
  const mapRef = useRef<MapRef>(null)

  const visiblePhotos = photos.filter(
    (p) => p.lat && p.lng && (activeTrip === 'all' || p.trip_id === activeTrip)
  )

  // 按精确坐标聚合，同一位置的多张照片合为一组
  const photoGroups = useMemo<PhotoGroup[]>(() => {
    const groups: Record<string, PhotoGroup> = {}
    for (const p of visiblePhotos) {
      const key = `${p.lat},${p.lng}`
      if (!groups[key]) groups[key] = { lat: p.lat!, lng: p.lng!, photos: [] }
      groups[key].photos.push(p)
    }
    return Object.values(groups)
  }, [visiblePhotos])

  const selectedPhoto = selectedGroup?.photos[groupIdx] ?? null

  function selectGroup(group: PhotoGroup) {
    setSelectedGroup(group)
    setGroupIdx(0)
  }

  function closePopup() {
    setSelectedGroup(null)
    setGroupIdx(0)
  }

  function changeActiveTrip(id: string) {
    setActiveTrip(id)
    setSelectedGroup(null)
  }

  function handleMapLoad() {
    const map = mapRef.current?.getMap()
    if (!map) return

    // 遍历所有 symbol 图层，将含 text-field 的图层切换为中文优先
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zhField: any = ['coalesce', ['get', 'name_zh-Hans'], ['get', 'name']]
    for (const layer of map.getStyle().layers) {
      if (layer.type !== 'symbol') continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(layer as any).layout?.['text-field']) continue
      try { map.setLayoutProperty(layer.id, 'text-field', zhField) } catch { /* skip */ }
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

    // 台湾下辖城市字体降级
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
        onClick={closePopup}
        onLoad={handleMapLoad}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {photoGroups.map((group) => (
          <Marker
            key={`${group.lat},${group.lng}`}
            longitude={group.lng}
            latitude={group.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation()
              selectGroup(group)
            }}
          >
            <div className="photo-marker group relative">
              <div
                className="w-12 h-12 rounded-full border-2 border-white shadow-md overflow-hidden
                           ring-2 ring-transparent group-hover:ring-primary-400 transition-all"
              >
                <img
                  src={thumbSrc(group.photos[0])}
                  alt={group.photos[0].title || ''}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* 多张照片时显示数量徽章 */}
              {group.photos.length > 1 && (
                <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center border border-white">
                  {group.photos.length}
                </div>
              )}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border border-stone-300 rotate-45 shadow-sm" />
            </div>
          </Marker>
        ))}

        {selectedGroup && selectedPhoto && (
          <Popup
            longitude={selectedGroup.lng}
            latitude={selectedGroup.lat}
            anchor="top"
            closeButton={false}
            className="photo-popup"
            maxWidth="300px"
            onClose={closePopup}
          >
            <div className="bg-white rounded-xl overflow-hidden shadow-lg w-[280px]">
              {/* 图片区：保留原始比例，不裁切 */}
              <div className="relative">
                <img
                  src={fullSrc(selectedPhoto)}
                  alt={selectedPhoto.title || ''}
                  className="w-full h-auto block max-h-72 object-contain bg-stone-50"
                />
                <button
                  onClick={closePopup}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                >
                  <X size={14} />
                </button>

                {/* 同位置多张照片翻页 */}
                {selectedGroup.photos.length > 1 && (
                  <>
                    {groupIdx > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setGroupIdx(i => i - 1) }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                      >
                        <ChevronLeft size={14} />
                      </button>
                    )}
                    {groupIdx < selectedGroup.photos.length - 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setGroupIdx(i => i + 1) }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                      >
                        <ChevronRight size={14} />
                      </button>
                    )}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/50 text-white text-[11px]">
                      {groupIdx + 1} / {selectedGroup.photos.length}
                    </div>
                  </>
                )}
              </div>

              {/* 信息区 */}
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
          onClick={() => changeActiveTrip('all')}
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
            onClick={() => changeActiveTrip(trip.id)}
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
