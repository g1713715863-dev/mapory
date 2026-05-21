import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')
  if (!lat || !lng) return NextResponse.json({})

  try {
    // Wikipedia geo search
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lng}&gsradius=20000&gslimit=5&format=json&origin=*`,
      { next: { revalidate: 3600 } }
    )
    const searchData = await searchRes.json()
    const pages: Array<{ pageid: number; title: string }> = searchData?.query?.geosearch ?? []
    if (pages.length === 0) return NextResponse.json({})

    // Get thumbnail — try each result until one has a photo
    for (const page of pages) {
      const thumbRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&pageids=${page.pageid}&prop=pageimages&pithumbsize=400&format=json&origin=*`,
        { next: { revalidate: 3600 } }
      )
      const thumbData = await thumbRes.json()
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
