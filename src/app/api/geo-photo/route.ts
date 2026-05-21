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
    const feature = geoData.features?.[0]
    if (!feature) return NextResponse.json({})

    // Combine city + country for a more specific query ("Beijing China"
    // beats "China" and avoids the same photo repeating across all of China)
    const parts: string[] = (feature.place_name ?? feature.text ?? '').split(', ')
    const keyword: string = parts.length >= 2
      ? `${parts[0]} ${parts[parts.length - 1]}`
      : (feature.text ?? '')
    if (!keyword) return NextResponse.json({})

    // Step 2: fetch 15 Pexels results so different coordinates can pick
    // different photos even when the keyword resolves to the same city
    const pexRes = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword + ' scenery')}&per_page=15&orientation=landscape`,
      { headers: { Authorization: pexelsKey }, next: { revalidate: 3600 } }
    )
    if (!pexRes.ok) return NextResponse.json({})
    const pexData = await pexRes.json()
    const photos: Array<{ src: { medium: string } }> = pexData.photos ?? []
    if (photos.length === 0) return NextResponse.json({})

    // Deterministic hash: same coordinate always gets the same photo,
    // but different coordinates get different photos within the result set
    const hash = Math.abs(Math.round(parseFloat(lat) * 137.3 + parseFloat(lng) * 97.7))
    const photo = photos[hash % photos.length]

    return NextResponse.json(
      { title: parts[0] ?? keyword, thumbnail: photo.src.medium },
      { headers: { 'Cache-Control': 'public, max-age=3600' } }
    )
  } catch {
    return NextResponse.json({})
  }
}
