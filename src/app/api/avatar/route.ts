import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadToR2 } from '@/lib/r2'
import sharp from 'sharp'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const raw = Buffer.from(await file.arrayBuffer())
  const jpeg = await sharp(raw).resize(256, 256, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer()

  const key = `avatars/${user.id}.jpg`
  const url = await uploadToR2(key, jpeg, 'image/jpeg')

  // Cache bust so the browser doesn't serve the old avatar
  const avatarUrl = `${url}?v=${Date.now()}`

  await supabase.from('user_profiles').update({ avatar_url: avatarUrl }).eq('id', user.id)

  return NextResponse.json({ url: avatarUrl })
}
