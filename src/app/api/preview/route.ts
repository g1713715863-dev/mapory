import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { heicToJpeg } from '@/lib/heic'

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const raw = Buffer.from(await file.arrayBuffer())
  const isHeic = /\.(heic|heif)$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif'
  try {
    const buffer = isHeic ? await heicToJpeg(raw, 0.8) : raw
    const jpeg = await sharp(buffer).resize(400).jpeg({ quality: 80 }).toBuffer()
    return new NextResponse(new Blob([new Uint8Array(jpeg)], { type: 'image/jpeg' }))
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
