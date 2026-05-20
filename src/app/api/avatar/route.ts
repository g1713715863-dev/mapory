import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { uploadToR2 } from '@/lib/r2'
import sharp from 'sharp'

export async function POST(req: NextRequest) {
  // Verify auth with session client
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const raw = Buffer.from(await file.arrayBuffer())
  const jpeg = await sharp(raw).resize(256, 256, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer()

  const key = `avatars/${user.id}.jpg`
  const baseUrl = await uploadToR2(key, jpeg, 'image/jpeg')
  const avatarUrl = `${baseUrl}?v=${Date.now()}`

  // Use service role to bypass RLS for the DB update
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const db = serviceKey
    ? createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
    : supabase

  const { error: updateError } = await db
    .from('user_profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (updateError) {
    console.error('[avatar] DB update failed:', updateError.message)
    // Still return the URL so the client can show it during the session
    return NextResponse.json({ url: avatarUrl, warning: updateError.message })
  }

  return NextResponse.json({ url: avatarUrl })
}
