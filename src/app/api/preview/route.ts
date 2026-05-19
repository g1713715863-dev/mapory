import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  try {
    const jpeg = await sharp(buffer).resize(400).jpeg({ quality: 80 }).toBuffer()
    return new NextResponse(new Blob([new Uint8Array(jpeg)], { type: 'image/jpeg' }))
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
