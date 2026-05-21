import { NextRequest, NextResponse } from 'next/server'

interface GeoPage { pageid: number; title: string }

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')
  if (!lat || !lng) return NextResponse.json({})

  try {
    // Wider radius (50km) and more candidates
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lng}&gsradius=50000&gslimit=10&format=json&origin=*`,
      { next: { revalidate: 3600 } }
    )
    const searchData = await searchRes.json()
    const pages: GeoPage[] = searchData?.query?.geosearch ?? []
    if (pages.length === 0) return NextResponse.json({})

    // Batch thumbnail request — one round-trip instead of up to 10
    const pageIds = pages.map(p => p.pageid).join('|')
    const thumbRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&pageids=${pageIds}&prop=pageimages&pithumbsize=400&format=json&origin=*`,
      { next: { revalidate: 3600 } }
    )
    const thumbData = await thumbRes.json()

    for (const page of pages) {
      const thumbnail = thumbData?.query?.pages?.[page.pageid]?.thumbnail?.source
      if (thumbnail) {
        return NextResponse.json(
          { title: page.title, thumbnail },
          { headers: { 'Cache-Control': 'public, max-age=3600' } }
        )
      }
    }
    return NextResponse.json({})
  } catch {
    return NextResponse.json({})
  }
}
