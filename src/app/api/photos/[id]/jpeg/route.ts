import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadToR2 } from '@/lib/r2'
import sharp from 'sharp'

// Public endpoint — converts a stored HEIC photo to JPEG on first request,
// saves both full-res and thumbnail back to R2, updates the DB, then returns JPEG.
// ?size=thumb returns the 400px thumbnail; default returns full-res.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const isThumb = req.nextUrl.searchParams.get('size') === 'thumb'

  const supabase = await createClient()
  const { data: photo } = await supabase
    .from('photos')
    .select('url, storage_key, thumbnail_url')
    .eq('id', id)
    .single()

  if (!photo) return new NextResponse('Not found', { status: 404 })

  // Fetch the HEIC (or any format) from R2
  const r2Res = await fetch(photo.url)
  if (!r2Res.ok) return new NextResponse('Source not found', { status: 502 })

  const buffer = Buffer.from(await r2Res.arrayBuffer())

  let fullJpeg: Buffer, thumbJpeg: Buffer
  try {
    ;[fullJpeg, thumbJpeg] = await Promise.all([
      sharp(buffer).jpeg({ quality: 90 }).toBuffer(),
      sharp(buffer).resize(400).jpeg({ quality: 75 }).toBuffer(),
    ])
  } catch (e) {
    return new NextResponse(`Conversion failed: ${e}`, { status: 500 })
  }

  // Save converted files to R2 and update the DB (don't await — let the response
  // stream back while the background write completes)
  const newKey = photo.storage_key.replace(/\.(heic|heif)$/i, '.jpg')
  const thumbKey = `thumbs/${id}.jpg`
  Promise.all([
    uploadToR2(newKey, fullJpeg, 'image/jpeg'),
    uploadToR2(thumbKey, thumbJpeg, 'image/jpeg'),
  ]).then(([newUrl, thumbUrl]) =>
    supabase.from('photos').update({ url: newUrl, thumbnail_url: thumbUrl, storage_key: newKey }).eq('id', id)
  ).catch(() => {})

  const out = isThumb ? thumbJpeg : fullJpeg
  return new NextResponse(new Blob([new Uint8Array(out)], { type: 'image/jpeg' }), {
    headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
  })
}
