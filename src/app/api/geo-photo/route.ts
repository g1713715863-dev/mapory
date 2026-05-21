import { NextRequest, NextResponse } from 'next/server'

const UA = { 'User-Agent': 'MaporyBot/1.0 (travel photo map; contact g1713715863@gmail.com)' }
const SKIP_EXT = /\.(svg|pdf|gif|tif|tiff|ogg|ogv|webm|mp4)$/i

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')
  if (!lat || !lng) return NextResponse.json({})

  try {
    // Search geotagged image files directly on Wikimedia Commons (single call)
    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${lat}|${lng}&ggsradius=50000&ggslimit=20&ggsnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=400&format=json`,
      { headers: UA, next: { revalidate: 3600 } }
    )
    if (!res.ok) return NextResponse.json({})
    const data = await res.json()

    const pages = Object.values(data?.query?.pages ?? {}) as Array<{
      title?: string
      imageinfo?: Array<{ thumburl?: string }>
    }>

    for (const page of pages) {
      const thumburl = page.imageinfo?.[0]?.thumburl
      if (!thumburl) continue
      if (SKIP_EXT.test(page.title ?? '')) continue
      const title = (page.title ?? '')
        .replace(/^File:/, '')
        .replace(/_/g, ' ')
        .replace(/\.[^.]+$/, '')
      return NextResponse.json(
        { title, thumbnail: thumburl },
        { headers: { 'Cache-Control': 'public, max-age=3600' } }
      )
    }
    return NextResponse.json({})
  } catch {
    return NextResponse.json({})
  }
}
