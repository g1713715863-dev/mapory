import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')
  if (!lat || !lng) return NextResponse.json({})

  const pexelsKey = process.env.PEXELS_KEY
  if (!pexelsKey) return NextResponse.json({})

  try {
    // Step 1: reverse-geocode coordinates to a place name
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    const geoRes = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&language=en&types=place,locality,country&limit=1`,
      { next: { revalidate: 3600 } }
    )
    if (!geoRes.ok) return NextResponse.json({})
    const geoData = await geoRes.json()
    const keyword: string = geoData.features?.[0]?.text ?? ''
    if (!keyword) return NextResponse.json({})

    // Step 2: search Pexels for a photo of that place
    const pexRes = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=1&orientation=square`,
      { headers: { Authorization: pexelsKey }, next: { revalidate: 3600 } }
    )
    if (!pexRes.ok) return NextResponse.json({})
    const pexData = await pexRes.json()
    const photo = pexData.photos?.[0]
    if (!photo) return NextResponse.json({})

    return NextResponse.json(
      { title: keyword, thumbnail: photo.src.medium },
      { headers: { 'Cache-Control': 'public, max-age=3600' } }
    )
  } catch {
    return NextResponse.json({})
  }
}
