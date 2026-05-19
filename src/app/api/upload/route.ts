import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadToR2 } from '@/lib/r2'
import { randomUUID } from 'crypto'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const form = await request.formData()
  const file = form.get('file') as File | null
  const tripId = form.get('trip_id') as string
  const title = (form.get('title') as string) || null
  const body = (form.get('body') as string) || null
  const lat = form.get('lat') ? parseFloat(form.get('lat') as string) : null
  const lng = form.get('lng') ? parseFloat(form.get('lng') as string) : null
  const locationName = (form.get('location_name') as string) || null
  const takenAt = (form.get('taken_at') as string) || null

  if (!file || !tripId) {
    return NextResponse.json({ error: 'Missing file or trip_id' }, { status: 400 })
  }

  let buffer: Buffer = Buffer.from(await file.arrayBuffer())
  const id = randomUUID()
  const rawExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'

  // HEIC/HEIF 转 JPEG（浏览器普遍不支持 HEIC 显示）
  let ext = rawExt
  let mime = file.type
  if (rawExt === 'heic' || rawExt === 'heif') {
    try {
      buffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer()
      ext = 'jpg'
      mime = 'image/jpeg'
    } catch {}
  }

  // 上传原图（HEIC 已转为 JPEG）
  const key = `photos/${id}.${ext}`
  const url = await uploadToR2(key, buffer, mime)

  // 生成缩略图（400px 宽）
  let thumbnailUrl: string | null = null
  try {
    const thumb = await sharp(buffer).resize(400).jpeg({ quality: 75 }).toBuffer()
    const thumbKey = `thumbs/${id}.jpg`
    thumbnailUrl = await uploadToR2(thumbKey, thumb, 'image/jpeg')
  } catch {}

  const { data, error } = await supabase
    .from('photos')
    .insert({
      id,
      trip_id: tripId,
      storage_key: key,
      url,
      thumbnail_url: thumbnailUrl,
      title,
      body,
      lat,
      lng,
      location_name: locationName,
      taken_at: takenAt,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ photo: data })
}
