import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')
  if (!lat || !lng) return NextResponse.json({})

  try {
    // Single request: generator=geosearch combines proximity search + image lookup
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${lat}|${lng}&ggsradius=50000&ggslimit=10&prop=pageimages&pithumbsize=400&format=json&origin=*`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return NextResponse.json({})
    const data = await res.json()

    const pages = Object.values(data?.query?.pages ?? {}) as Array<{
      title: string
      thumbnail?: { source: string }
    }>

    for (const page of pages) {
      if (page.thumbnail?.source) {
        return NextResponse.json(
          { title: page.title, thumbnail: page.thumbnail.source },
          { headers: { 'Cache-Control': 'public, max-age=3600' } }
        )
      }
    }
    return NextResponse.json({})
  } catch {
    return NextResponse.json({})
  }
}
