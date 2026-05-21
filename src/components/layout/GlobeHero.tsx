'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import Map, { type MapRef } from 'react-map-gl/mapbox'
import { Upload, MapIcon, Share2 } from 'lucide-react'
import 'mapbox-gl/dist/mapbox-gl.css'

interface GeoPhoto {
  title: string
  thumbnail: string
}

const BASE_ZOOM = 2.2
const BREATHE_AMP = 0.04
const BREATHE_SPEED = 0.006
const ROTATE_SPEED = 0.012

const tips = [
  { step: '01', icon: Upload,  title: '上传', desc: '拖入旅行照片，GPS 自动定位，手动也可精调' },
  { step: '02', icon: MapIcon, title: '查看', desc: '地图模式看足迹分布，相册模式按时间翻阅' },
  { step: '03', icon: Share2,  title: '分享', desc: '生成专属相册链接，把故事分享给家人朋友' },
]

export default function GlobeHero() {
  const mapRef      = useRef<MapRef>(null)
  const [loaded, setLoaded]     = useState(false)
  const [geoPhoto, setGeoPhoto] = useState<GeoPhoto | null>(null)
  const [fetching, setFetching] = useState(false)
  const [bubblePos, setBubblePos] = useState({ x: 0, y: 0 })

  const rafRef         = useRef<number>(0)
  const lngRef         = useRef(0)
  const breathRef      = useRef(0)
  const isHovering     = useRef(false)
  const debounceTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track where the last fetch was triggered; only clear photo on large movement
  const fetchPosRef    = useRef<{ x: number; y: number } | null>(null)

  // Auto-rotation + breathing — completely paused while hovering
  useEffect(() => {
    if (!loaded) return
    const map = mapRef.current?.getMap()
    if (!map) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(map as any).setProjection('globe')

    function animate() {
      if (!isHovering.current) {
        breathRef.current += BREATHE_SPEED
        lngRef.current    += ROTATE_SPEED
        const lng  = lngRef.current % 360
        const zoom = BASE_ZOOM + Math.sin(breathRef.current) * BREATHE_AMP
        map!.setCenter([lng > 180 ? lng - 360 : lng, 20])
        map!.setZoom(zoom)
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [loaded])

  useEffect(() => {
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e
    isHovering.current = true
    setBubblePos({ x: clientX, y: clientY })

    // Only clear photo when cursor moves far (>100px) from where it was fetched
    if (fetchPosRef.current) {
      const dx = clientX - fetchPosRef.current.x
      const dy = clientY - fetchPosRef.current.y
      if (Math.hypot(dx, dy) > 100) {
        setGeoPhoto(null)
        fetchPosRef.current = null
      }
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(async () => {
      const map = mapRef.current?.getMap()
      if (!map) return
      const container = map.getContainer()
      const rect = container.getBoundingClientRect()
      const lngLat = map.unproject([clientX - rect.left, clientY - rect.top])
      if (!lngLat || isNaN(lngLat.lat) || isNaN(lngLat.lng)) return

      if (Math.abs(lngLat.lat) > 85) return
      const lat = lngLat.lat.toFixed(3)
      const lng = lngLat.lng.toFixed(3)
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      fetchPosRef.current = { x: clientX, y: clientY }
      setFetching(true)
      try {
        const geoRes = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,region,country&language=zh&limit=1&access_token=${token}`
        )
        if (geoRes.ok) {
          const geoData = await geoRes.json()
          const title = geoData.features?.[0]?.place_name ?? `${lat}°, ${lng}°`
          const thumbnail = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},9,0/200x200@2x?access_token=${token}`
          setGeoPhoto({ title, thumbnail })
        }
      } catch { /* ignore */ } finally {
        setFetching(false)
      }
    }, 300)
  }, [])

  const handleMouseLeave = useCallback(() => {
    isHovering.current  = false
    fetchPosRef.current = null
    setGeoPhoto(null)
    setFetching(false)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
  }, [])

  const handleLoad = useCallback(() => {
    setLoaded(true)
    const map = mapRef.current?.getMap()
    if (!map) return
    if (map.getLayer('country-label')) {
      const existing = map.getFilter('country-label')
      map.setFilter('country-label', [
        'all',
        ...(existing ? [existing] : []),
        ['!=', ['get', 'name_en'], 'Taiwan'],
      ])
    }
  }, [])

  return (
    <div
      className="relative md:-mt-14 h-screen bg-[#0a0908] overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Globe */}
      <div className="absolute inset-0">
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          initialViewState={{ longitude: 0, latitude: 20, zoom: BASE_ZOOM }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/light-v11"
          interactive={false}
          attributionControl={false}
          onLoad={handleLoad}
        />
      </div>

      {/* Bottom gradient — 5-stop inline for smooth fade */}
      <div
        className="absolute inset-x-0 bottom-0 h-72 pointer-events-none z-10"
        style={{ background: 'linear-gradient(to top, #0a0908 0%, rgba(10,9,8,0.82) 18%, rgba(10,9,8,0.52) 38%, rgba(10,9,8,0.18) 62%, rgba(10,9,8,0.04) 82%, transparent 100%)' }}
      />

      {/* Three-step tip cards */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-6 pb-7 md:pb-9">
        <div className="max-w-2xl mx-auto grid grid-cols-3 gap-3">
          {tips.map(({ step, icon: Icon, title, desc }) => (
            <div
              key={step}
              className="rounded-xl border border-white/15 bg-white/8 backdrop-blur-sm p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-white/40 text-[10px] font-mono">{step}</span>
                <Icon size={13} className="text-white/60" />
                <span className="text-white text-sm font-medium">{title}</span>
              </div>
              <p className="text-white/65 text-[11px] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Hover hint */}
      {loaded && (
        <p className="absolute top-[58%] inset-x-0 text-center text-white/12 text-[11px] tracking-widest pointer-events-none z-10 select-none">
          悬停任意位置探索世界
        </p>
      )}

      {/* Fetching indicator */}
      {fetching && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: bubblePos.x + 14, top: bubblePos.y - 14 }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-white/60 animate-pulse" />
        </div>
      )}

      {/* Polaroid bubble */}
      {geoPhoto && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: bubblePos.x + 28,
            top:  Math.max(16, bubblePos.y - 150),
          }}
        >
          <div
            className="bg-white shadow-2xl"
            style={{ padding: '10px 10px 28px', width: 168, transform: 'rotate(-2.5deg)' }}
          >
            <img
              src={geoPhoto.thumbnail}
              alt={geoPhoto.title}
              className="w-full aspect-square object-cover block"
            />
            <p className="text-stone-500 text-[10px] text-center mt-2 truncate">
              {geoPhoto.title}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
