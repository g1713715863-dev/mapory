'use client'

import { useState, useCallback } from 'react'
import Map, { Marker } from 'react-map-gl/mapbox'
import { MapPin, X, Check, Loader } from 'lucide-react'
import 'mapbox-gl/dist/mapbox-gl.css'

interface LocationPickerModalProps {
  initialLat?: number | null
  initialLng?: number | null
  onConfirm: (lat: number, lng: number, locationName: string) => void
  onClose: () => void
}

async function reverseGeocode(lng: number, lat: number): Promise<string> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&language=zh&types=poi,place,locality,neighborhood,district&limit=1`
  )
  const data = await res.json()
  return data.features?.[0]?.place_name ?? ''
}

export default function LocationPickerModal({
  initialLat,
  initialLng,
  onConfirm,
  onClose,
}: LocationPickerModalProps) {
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  )
  const [placeName, setPlaceName] = useState('')
  const [geocoding, setGeocoding] = useState(false)

  const handleMapClick = useCallback((event: { lngLat: { lat: number; lng: number } }) => {
    const { lat, lng } = event.lngLat
    setMarker({ lat, lng })
    setPlaceName('')
    setGeocoding(true)
    reverseGeocode(lng, lat).then((name) => {
      setPlaceName(name)
      setGeocoding(false)
    })
  }, [])

  function handleConfirm() {
    if (!marker) return
    onConfirm(marker.lat, marker.lng, placeName)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex flex-col flex-1 m-4 md:m-auto md:w-full md:max-w-xl md:my-auto md:max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2 text-stone-800 font-medium">
            <MapPin size={16} className="text-primary-500" />
            在地图上选择位置
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 提示文字 */}
        <p className="text-xs text-stone-400 px-4 py-2 shrink-0">
          {marker ? '可以再次点击移动标记' : '点击地图任意位置放置标记'}
        </p>

        {/* 地图 */}
        <div className="flex-1 min-h-0">
          <Map
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
            initialViewState={
              initialLat && initialLng
                ? { longitude: initialLng, latitude: initialLat, zoom: 10 }
                : { longitude: 105, latitude: 35, zoom: 3 }
            }
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/light-v11"
            onClick={handleMapClick}
            cursor={marker ? 'crosshair' : 'pointer'}
          >
            {marker && (
              <Marker longitude={marker.lng} latitude={marker.lat} anchor="bottom">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-primary-500 border-2 border-white shadow-lg flex items-center justify-center">
                    <MapPin size={14} className="text-white" />
                  </div>
                  <div className="w-0.5 h-2 bg-primary-500" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500/40" />
                </div>
              </Marker>
            )}
          </Map>
        </div>

        {/* 底部确认栏 */}
        <div className="px-4 py-3 border-t border-stone-100 shrink-0 space-y-2">
          {marker && (
            <div className="flex items-center gap-2 text-sm text-stone-600 min-h-[20px]">
              {geocoding ? (
                <><Loader size={13} className="animate-spin text-stone-400" /> 识别地点中…</>
              ) : placeName ? (
                <><MapPin size={13} className="text-primary-500 shrink-0" /> <span className="truncate">{placeName}</span></>
              ) : (
                <span className="text-stone-400 text-xs">
                  {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
                </span>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={!marker}
              className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <Check size={15} />
              确认位置
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
