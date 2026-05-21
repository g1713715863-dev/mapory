import { NextRequest, NextResponse } from 'next/server'

interface GeoPage { pageid: number; title: string }

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')
  if (!lat || !lng) return NextResponse.json({})

  try {
    // Step 1: find nearby Wikipedia articles
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lng}&gsradius=100000&gslimit=20&format=json&origin=*`,
      { next: { revalidate: 3600 } }
    )
    if (!searchRes.ok) return NextResponse.json({})
    const searchData = await searchRes.json()
    const pages: GeoPage[] = searchData?.query?.geosearch ?? []
    if (pages.length === 0) return NextResponse.json({})

    // Step 2: batch-fetch thumbnails for all candidates in one request
    const pageIds = pages.map(p => p.pageid).join('|')
    const thumbRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&pageids=${pageIds}&prop=pageimages&pithumbsize=400&format=json&origin=*`,
      { next: { revalidate: 3600 } }
    )
    if (!thumbRes.ok) return NextResponse.json({})
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
