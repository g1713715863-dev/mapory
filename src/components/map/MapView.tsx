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

// 根据 zoom 返回标记大小和弹窗宽度
// 缩小时（zoom 小）照片少、稀疏 → 标记和弹窗更大
// 放大时（zoom 大）照片密集 → 标记和弹窗适当缩小
function getScale(zoom: number) {
  if (zoom < 5)  return { markerPx: 72, popupPx: 420 }
  if (zoom < 8)  return { markerPx: 60, popupPx: 380 }
  if (zoom < 11) return { markerPx: 52, popupPx: 340 }
  return             { markerPx: 44, popupPx: 300 }
}

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
  const [zoom, setZoom] = useState(4)
  const mapRef = useRef<MapRef>(null)

  const scale = getScale(Math.floor(zoom))

  const visiblePhotos = photos.filter(
    (p) => p.lat && p.lng && (activeTrip === 'all' || p.trip_id === activeTrip)
  )

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zhField: any = ['coalesce', ['get', 'name_zh-Hans'], ['get', 'name']]
    for (const layer of map.getStyle().layers) {
      if (layer.type !== 'symbol') continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(layer as any).layout?.['text-field']) continue
      try { map.setLayoutProperty(layer.id, 'text-field', zhField) } catch { /* skip */ }
    }

    if (map.getLayer('country-label')) {
      const existing = map.getFilter('country-label')
      map.setFilter('country-label', [
        'all',
        ...(existing ? [existing] : []),
        ['!=', ['get', 'name_en'], 'Taiwan'],
      ])
    }

    if (map.getLayer('settlement-label')) {
      map.setLayoutProperty('settlement-label', 'text-size', [
        'interpolate', ['linear'], ['zoom'],
        4,  ['case', ['==', ['get', 'iso_3166_1'], 'TW'], 8,  10],
        8,  ['case', ['==', ['get', 'iso_3166_1'], 'TW'], 11, 14],
        14, ['case', ['==', ['get', 'iso_3166_1'], 'TW'], 13, 16],
      ])
    }
  }

  const badgePx = Math.round(scale.markerPx * 0.32)
  const dotPx   = Math.round(scale.markerPx * 0.18)

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
        onMove={(e) => {
          const z = Math.floor(e.viewState.zoom)
          setZoom((prev) => (prev === z ? prev : z))
        }}
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
            <div className="photo-marker group relative" style={{ width: scale.markerPx }}>
              {/* 圆形照片缩略图 */}
              <div
                className="rounded-full border-2 border-white shadow-md overflow-hidden
                           ring-2 ring-transparent group-hover:ring-primary-400 transition-all"
                style={{ width: scale.markerPx, height: scale.markerPx }}
              >
                <img
                  src={thumbSrc(group.photos[0])}
                  alt={group.photos[0].title || ''}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 多张照片数量徽章 */}
              {group.photos.length > 1 && (
                <div
                  className="absolute -top-1 -right-1 rounded-full bg-primary-500 text-white font-bold flex items-center justify-center border-2 border-white"
                  style={{ width: badgePx, height: badgePx, fontSize: Math.round(badgePx * 0.55) }}
                >
                  {group.photos.length}
                </div>
              )}

              {/* 底部小三角针尖 */}
              <div
                className="absolute left-1/2 -translate-x-1/2 bg-white border border-stone-300 rotate-45 shadow-sm"
                style={{ width: dotPx, height: dotPx, bottom: -Math.round(dotPx * 0.5) }}
              />
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
            maxWidth={`${scale.popupPx + 24}px`}
            onClose={closePopup}
          >
            <div
              className="bg-white rounded-2xl overflow-hidden shadow-xl"
              style={{ width: scale.popupPx }}
            >
              {/* 图片区：保留原始长宽比 */}
              <div className="relative">
                <img
                  src={fullSrc(selectedPhoto)}
                  alt={selectedPhoto.title || ''}
                  className="block mx-auto"
                  style={{ maxWidth: '100%', maxHeight: Math.round(scale.popupPx * 0.85), width: 'auto', height: 'auto' }}
                />
                <button
                  onClick={closePopup}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                >
                  <X size={16} />
                </button>

                {/* 同位置多张翻页 */}
                {selectedGroup.photos.length > 1 && (
                  <>
                    {groupIdx > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setGroupIdx((i) => i - 1) }}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                      >
                        <ChevronLeft size={16} />
                      </button>
                    )}
                    {groupIdx < selectedGroup.photos.length - 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setGroupIdx((i) => i + 1) }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    )}
                    <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs font-medium">
                      {groupIdx + 1} / {selectedGroup.photos.length}
                    </div>
                  </>
                )}
              </div>

              {/* 文字信息区 */}
              <div className="px-4 py-3 space-y-1">
                {selectedPhoto.title && (
                  <p className="font-semibold text-stone-800 text-base leading-snug">{selectedPhoto.title}</p>
                )}
                {selectedPhoto.location_name && (
                  <p className="text-sm text-stone-500 flex items-center gap-1">
                    📍 <span className="truncate">{selectedPhoto.location_name}</span>
                  </p>
                )}
                {selectedPhoto.taken_at && (
                  <p className="text-sm text-stone-400">
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
