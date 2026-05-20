'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/mapbox'
import Supercluster from 'supercluster'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Photo, Trip } from '@/types'
import { X, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'

interface MapViewProps {
  photos: Photo[]
  trips: Trip[]
}

type PhotoGroup = { lat: number; lng: number; photos: Photo[] }
type PointProps = { group: PhotoGroup; photoCount: number }
type ClusterProps = { photoCount: number }

function getScale(zoom: number) {
  if (zoom < 5)  return { markerPx: 92 }
  if (zoom < 8)  return { markerPx: 78 }
  if (zoom < 11) return { markerPx: 66 }
  return             { markerPx: 56 }
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
  const [bounds, setBounds] = useState<[number, number, number, number]>([-180, -85, 180, 85])
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

  const supercluster = useMemo(() => {
    const sc = new Supercluster<PointProps, ClusterProps>({
      radius: 60,
      maxZoom: 16,
      map: (props) => ({ photoCount: props.photoCount }),
      reduce: (acc, props) => { acc.photoCount += props.photoCount },
    })
    sc.load(
      photoGroups.map((group) => ({
        type: 'Feature' as const,
        properties: { group, photoCount: group.photos.length },
        geometry: { type: 'Point' as const, coordinates: [group.lng, group.lat] },
      }))
    )
    return sc
  }, [photoGroups])

  const clusters = useMemo(
    () => supercluster.getClusters(bounds, Math.floor(zoom)),
    [supercluster, bounds, zoom]
  )

  const selectedPhoto = selectedGroup?.photos[groupIdx] ?? null

  function selectGroup(group: PhotoGroup) {
    setSelectedGroup(group)
    setGroupIdx(0)
  }

  function closeModal() {
    setSelectedGroup(null)
    setGroupIdx(0)
  }

  function changeActiveTrip(id: string) {
    setActiveTrip(id)
    setSelectedGroup(null)
  }

  const syncMapState = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    const b = map.getBounds()
    if (!b) return
    setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()])
  }, [])

  function handleMapLoad() {
    syncMapState()
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
        onLoad={handleMapLoad}
        onMove={(e) => {
          const z = Math.floor(e.viewState.zoom)
          setZoom((prev) => (prev === z ? prev : z))
          syncMapState()
        }}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {clusters.map((cluster) => {
          const [lng, lat] = cluster.geometry.coordinates
          const props = cluster.properties

          // ── Cluster marker ──────────────────────────────────────────────
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((props as any).cluster) {
            const clusterId = (props as { cluster_id: number }).cluster_id
            const photoCount = (props as unknown as ClusterProps & { cluster: true }).photoCount
            const leaves = supercluster.getLeaves(clusterId, 3)
            const previewPhotos = leaves.map((l) => (l.properties as PointProps).group.photos[0])

            const thumbSize = Math.round(scale.markerPx * 0.72)
            const stride    = Math.round(thumbSize * 0.55)
            const clusterW  = thumbSize + stride * (previewPhotos.length - 1) + Math.round(badgePx * 0.6)

            return (
              <Marker
                key={`cluster-${clusterId}`}
                longitude={lng}
                latitude={lat}
                anchor="center"
                onClick={(e) => {
                  e.originalEvent.stopPropagation()
                  const expansionZoom = supercluster.getClusterExpansionZoom(clusterId)
                  mapRef.current?.flyTo({ center: [lng, lat], zoom: Math.min(expansionZoom, 16), duration: 600 })
                }}
              >
                <div className="relative cursor-pointer" style={{ width: clusterW, height: thumbSize }}>
                  {previewPhotos.map((photo, i) => (
                    <div
                      key={photo.id}
                      className="absolute rounded-full border-2 border-white shadow-md overflow-hidden"
                      style={{ width: thumbSize, height: thumbSize, left: i * stride, zIndex: previewPhotos.length - i }}
                    >
                      <img src={thumbSrc(photo)} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <div
                    className="absolute -top-1.5 rounded-full bg-primary-500 text-white font-bold flex items-center justify-center border-2 border-white shadow"
                    style={{ width: badgePx + 6, height: badgePx + 6, fontSize: Math.round((badgePx + 6) * 0.48), right: 0, zIndex: 20 }}
                  >
                    {photoCount}
                  </div>
                </div>
              </Marker>
            )
          }

          // ── Individual location marker ───────────────────────────────────
          const group = (props as PointProps).group

          return (
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
                {group.photos.length > 1 && (
                  <div
                    className="absolute -top-1 -right-1 rounded-full bg-primary-500 text-white font-bold flex items-center justify-center border-2 border-white"
                    style={{ width: badgePx, height: badgePx, fontSize: Math.round(badgePx * 0.55) }}
                  >
                    {group.photos.length}
                  </div>
                )}
                <div
                  className="absolute left-1/2 -translate-x-1/2 bg-white border border-stone-300 rotate-45 shadow-sm"
                  style={{ width: dotPx, height: dotPx, bottom: -Math.round(dotPx * 0.5) }}
                />
              </div>
            </Marker>
          )
        })}
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

      {/* 照片详情弹窗（全屏遮罩 Modal） */}
      {selectedGroup && selectedPhoto && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
          onClick={closeModal}
        >
          <div
            className="relative bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col w-full max-w-xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 图片区 */}
            <div className="relative flex-1 min-h-0 flex items-center justify-center bg-black overflow-hidden">
              <img
                src={fullSrc(selectedPhoto)}
                alt={selectedPhoto.title || ''}
                className="block"
                style={{ maxWidth: '100%', maxHeight: '75vh', width: 'auto', height: 'auto', objectFit: 'contain' }}
              />

              {/* 关闭 */}
              <button
                onClick={closeModal}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X size={18} />
              </button>

              {/* 翻页 */}
              {selectedGroup.photos.length > 1 && (
                <>
                  {groupIdx > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setGroupIdx((i) => i - 1) }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  {groupIdx < selectedGroup.photos.length - 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setGroupIdx((i) => i + 1) }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  )}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-sm font-medium">
                    {groupIdx + 1} / {selectedGroup.photos.length}
                  </div>
                </>
              )}
            </div>

            {/* 文字信息区 */}
            <div className="shrink-0 px-5 py-4 space-y-1.5 border-t border-stone-100">
              {selectedPhoto.title && (
                <p className="font-semibold text-stone-800 text-lg leading-snug">{selectedPhoto.title}</p>
              )}
              {selectedPhoto.location_name && (
                <p className="text-sm text-stone-500 flex items-center gap-1.5">
                  <MapPin size={13} className="text-primary-500 shrink-0" />
                  <span className="truncate">{selectedPhoto.location_name}</span>
                </p>
              )}
              {selectedPhoto.taken_at && (
                <p className="text-sm text-stone-400">
                  {new Date(selectedPhoto.taken_at).toLocaleDateString('zh-CN')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
