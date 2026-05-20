import { NextRequest, NextResponse } from 'next/server'
import { gcj02ToWgs84 } from '@/lib/coords'

function hasChinese(s: string) { return /[一-鿿]/.test(s) }

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (!q.trim()) return NextResponse.json([])

  const amapKey = process.env.AMAP_KEY

  // 中文查询 → 高德 POI 关键词搜索（精确到餐厅级别）
  if (hasChinese(q) && amapKey) {
    const res = await fetch(
      `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(q)}&key=${amapKey}&output=JSON&offset=8&language=1`
    )
    const data = await res.json()
    if (data.status !== '1' || !Array.isArray(data.pois)) return NextResponse.json([])

    return NextResponse.json(
      data.pois.map((poi: {
        id: string; name: string; location: string
        address: string; cityname: string; adname: string
      }) => {
        const [gcjLng, gcjLat] = poi.location.split(',').map(Number)
        const [wgsLng, wgsLat] = gcj02ToWgs84(gcjLng, gcjLat)
        const label = [poi.name, poi.adname, poi.cityname].filter(Boolean).join(' · ')
        return { id: poi.id, place_name: label, center: [wgsLng, wgsLat] }
      })
    )
  }

  // 非中文查询 → Google Maps Places Text Search
  const googleKey = process.env.GOOGLE_MAPS_KEY
  if (googleKey) {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&key=${googleKey}&language=zh`
    )
    const data = await res.json()
    return NextResponse.json(
      (data.results ?? []).slice(0, 6).map((p: {
        place_id: string; name: string; formatted_address: string
        geometry: { location: { lat: number; lng: number } }
      }) => ({
        id: p.place_id,
        place_name: `${p.name} · ${p.formatted_address}`,
        center: [p.geometry.location.lng, p.geometry.location.lat] as [number, number],
      }))
    )
  }

  // 兜底：Key 未配置时退化到 Mapbox
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&language=zh&limit=6`
  )
  const data = await res.json()
  return NextResponse.json(
    (data.features ?? []).map((f: { id: string; place_name: string; center: [number, number] }) => ({
      id: f.id, place_name: f.place_name, center: f.center,
    }))
  )
}
