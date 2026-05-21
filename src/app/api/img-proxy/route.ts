import { NextRequest } from 'next/server'

const ALLOWED = ['upload.wikimedia.org', 'commons.wikimedia.org', 'images.pexels.com']

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return new Response(null, { status: 400 })
  try {
    const { hostname } = new URL(url)
    if (!ALLOWED.some(h => hostname === h || hostname.endsWith('.' + h))) {
      return new Response(null, { status: 403 })
    }
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MaporyBot/1.0)' },
    })
    if (!upstream.ok) return new Response(null, { status: upstream.status })
    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    })
  } catch {
    return new Response(null, { status: 500 })
  }
}
