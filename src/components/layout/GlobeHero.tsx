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
const ROTATE_MAX = 0.08
const ROTATE_MIN = -0.05

const tips = [
  { step: '01', icon: Upload,  title: '上传', desc: '拖入旅行照片，GPS 自动定位，手动也可精调' },
  { step: '02', icon: MapIcon, title: '查看', desc: '地图模式看足迹分布，相册模式按时间翻阅' },
  { step: '03', icon: Share2,  title: '分享', desc: '生成专属相册链接，把故事分享给家人朋友' },
]

export default function GlobeHero() {
  const mapRef      = useRef<MapRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded]     = useState(false)
  const [geoPhoto, setGeoPhoto] = useState<GeoPhoto | null>(null)
  const [fetching, setFetching] = useState(false)
  const [bubblePos, setBubblePos] = useState({ x: 0, y: 0 })

  const rafRef           = useRef<number>(0)
  const lngRef           = useRef(0)
  const breathRef        = useRef(0)
  const isHovering       = useRef(false)
  const rotateSpeedRef   = useRef(ROTATE_SPEED)
  const isTouchDragging  = useRef(false)
  const debounceTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchPosRef      = useRef<{ x: number; y: number } | null>(null)

  // Touch: drag left/right to spin the globe
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let lastX = 0
    const onTouchStart = (e: TouchEvent) => {
      lastX = e.touches[0].clientX
      isTouchDragging.current = true
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!isTouchDragging.current) return
      e.preventDefault()
      const dx = e.touches[0].clientX - lastX
      lngRef.current -= dx * 0.4   // drag right → globe turns right
      lastX = e.touches[0].clientX
    }
    const onTouchEnd = () => { isTouchDragging.current = false }
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove',  onTouchMove,  { passive: false })
    el.addEventListener('touchend',   onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove',  onTouchMove)
      el.removeEventListener('touchend',   onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  // Wheel: scroll down = spin faster right, scroll up = slow / reverse
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      rotateSpeedRef.current = Math.max(
        ROTATE_MIN,
        Math.min(ROTATE_MAX, rotateSpeedRef.current + e.deltaY * 0.0001)
      )
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Auto-rotation + breathing — paused while hovering
  useEffect(() => {
    if (!loaded) return
    const map = mapRef.current?.getMap()
    if (!map) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(map as any).setProjection('globe')

    function animate() {
      rotateSpeedRef.current += (ROTATE_SPEED - rotateSpeedRef.current) * 0.015

      // Apply movement when touch-dragging OR auto-rotating (not mouse-hovering)
      if (isTouchDragging.current || !isHovering.current) {
        breathRef.current += BREATHE_SPEED
        if (!isTouchDragging.current) lngRef.current += rotateSpeedRef.current
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
    setBubblePos({ x: clientX, y: clientY })

    const mapInst = mapRef.current?.getMap()
    if (mapInst) {
      const rect = mapInst.getContainer().getBoundingClientRect()
      const centre = mapInst.getCenter()
      const limbPx = mapInst.project([centre.lng + 90, 0])
      const cx = rect.width / 2
      const cy = rect.height / 2
      const globeR = Math.hypot(limbPx.x - cx, limbPx.y - cy)
      const ddx = (clientX - rect.left) - cx
      const ddy = (clientY - rect.top) - cy
      isHovering.current = Math.hypot(ddx, ddy) <= globeR
    } else {
      isHovering.current = false
    }

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
      fetchPosRef.current = { x: clientX, y: clientY }
      setFetching(true)
      try {
        const res = await fetch(`/api/geo-photo?lat=${lat}&lng=${lng}`)
        if (res.ok) {
          const data = await res.json()
          if (data.title) {
            setGeoPhoto({
              title: data.title,
              thumbnail: `/api/img-proxy?url=${encodeURIComponent(data.thumbnail)}`,
            })
          }
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

    // Taiwan label fix
    if (map.getLayer('country-label')) {
      const existing = map.getFilter('country-label')
      map.setFilter('country-label', [
        'all',
        ...(existing ? [existing] : []),
        ['!=', ['get', 'name_en'], 'Taiwan'],
      ])
    }

    // Dark outer space + subtle stars — must be set explicitly or some styles override it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(map as any).setFog({
      color: 'rgba(10,9,8,0.5)',
      'high-color': '#0d0c0b',
      'space-color': '#0a0908',
      'star-intensity': 0.25,
      range: [0.8, 8],
      'horizon-blend': 0.04,
    })

    // DEM hillshade for light/shadow terrain relief
    if (!map.getSource('mapbox-dem')) {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      })
      const firstSymbol = map.getStyle().layers.find(l => l.type === 'symbol')?.id
      map.addLayer(
        {
          id: 'terrain-hillshade',
          type: 'hillshade',
          source: 'mapbox-dem',
          paint: {
            'hillshade-illumination-direction': 335,
            'hillshade-exaggeration': 0.35,
            'hillshade-shadow-color': '#5a3d25',
            'hillshade-highlight-color': '#ffffff',
            'hillshade-accent-color': '#6b4c30',
          },
        },
        firstSymbol,
      )
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative md:-mt-14 h-screen bg-[#0a0908] overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Globe — satellite imagery desaturated to natural terrain palette:
           forests → olive green, plains → tan, deserts → warm grey */}
      <div className="absolute inset-0" style={{ filter: 'saturate(0.30) brightness(1.12) contrast(0.87)' }}>
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          initialViewState={{ longitude: 0, latitude: 20, zoom: BASE_ZOOM }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
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
            left: bubblePos.x + 32,
            top:  Math.max(16, bubblePos.y - 200),
          }}
        >
          <div
            className="bg-white shadow-2xl"
            style={{ padding: '12px 12px 40px', width: 220 }}
          >
            <img
              src={geoPhoto.thumbnail}
              alt={geoPhoto.title}
              className="w-full aspect-square object-cover block"
            />
            <p className="text-stone-500 text-[11px] text-center mt-2 truncate">
              {geoPhoto.title}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
