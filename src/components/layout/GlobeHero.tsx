'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import Map, { type MapRef } from 'react-map-gl/mapbox'
import Link from 'next/link'
import { Upload, MapIcon, Share2 } from 'lucide-react'
import 'mapbox-gl/dist/mapbox-gl.css'

interface GeoPhoto {
  title: string
  thumbnail: string
}

const BASE_ZOOM = 2.2
const BREATHE_AMP = 0.04   // ±0.04 zoom
const BREATHE_SPEED = 0.006 // ~5s cycle at 60fps
const ROTATE_SPEED = 0.012  // deg/frame ≈ 0.7 deg/s → full rotation ~8.5 min

const tips = [
  {
    step: '01',
    icon: Upload,
    title: '上传',
    desc: '拖入旅行照片，GPS 自动定位，手动也可精调',
  },
  {
    step: '02',
    icon: MapIcon,
    title: '查看',
    desc: '地图模式看足迹分布，相册模式按时间翻阅',
  },
  {
    step: '03',
    icon: Share2,
    title: '分享',
    desc: '生成专属相册链接，把故事分享给家人朋友',
  },
]

export default function GlobeHero() {
  const mapRef = useRef<MapRef>(null)
  const [loaded, setLoaded] = useState(false)
  const [geoPhoto, setGeoPhoto] = useState<GeoPhoto | null>(null)
  const [bubblePos, setBubblePos] = useState({ x: 0, y: 0 })
  const rafRef = useRef<number>(0)
  const lngRef = useRef(0)
  const breathRef = useRef(0)
  const isHovering = useRef(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-rotation + zoom breathing (no CSS transform — keeps unproject accurate)
  useEffect(() => {
    if (!loaded) return
    const map = mapRef.current?.getMap()
    if (!map) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(map as any).setProjection('globe')

    function animate() {
      breathRef.current += BREATHE_SPEED
      const zoom = BASE_ZOOM + Math.sin(breathRef.current) * BREATHE_AMP
      if (!isHovering.current) {
        lngRef.current += ROTATE_SPEED
        const lng = lngRef.current % 360
        map!.setCenter([lng > 180 ? lng - 360 : lng, 20])
      }
      map!.setZoom(zoom)
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
    setGeoPhoto(null)

    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(async () => {
      const map = mapRef.current?.getMap()
      if (!map) return
      // Use the actual canvas element bounds for accurate unproject
      const canvas = map.getCanvas()
      const rect = canvas.getBoundingClientRect()
      const lngLat = map.unproject([clientX - rect.left, clientY - rect.top])
      if (!lngLat || Math.abs(lngLat.lat) > 85) return

      try {
        const res = await fetch(
          `/api/geo-photo?lat=${lngLat.lat.toFixed(3)}&lng=${lngLat.lng.toFixed(3)}`
        )
        if (res.ok) {
          const data = await res.json()
          if (data.title) setGeoPhoto(data)
        }
      } catch { /* ignore */ }
    }, 700)
  }, [])

  const handleMouseLeave = useCallback(() => {
    isHovering.current = false
    setGeoPhoto(null)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
  }, [])

  return (
    <div
      className="relative md:-mt-14 h-screen bg-[#0a0908] overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Globe — no CSS transform so unproject stays accurate */}
      <div className="absolute inset-0">
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          initialViewState={{ longitude: 0, latitude: 20, zoom: BASE_ZOOM }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/light-v11"
          interactive={false}
          attributionControl={false}
          onLoad={() => setLoaded(true)}
        />
      </div>

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#0a0908] to-transparent pointer-events-none z-10" />

      {/* Three-step tip cards */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-6 pb-8 md:pb-10">
        <div className="max-w-2xl mx-auto grid grid-cols-3 gap-3">
          {tips.map(({ step, icon: Icon, title, desc }) => (
            <div
              key={step}
              className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-white/30 text-[10px] font-mono">{step}</span>
                <Icon size={13} className="text-white/50" />
                <span className="text-white text-sm font-medium">{title}</span>
              </div>
              <p className="text-white/40 text-[11px] leading-relaxed">{desc}</p>
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

      {/* Polaroid bubble */}
      {geoPhoto && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: bubblePos.x + 28,
            top: Math.max(16, bubblePos.y - 150),
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
