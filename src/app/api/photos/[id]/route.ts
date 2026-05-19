import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteFromR2 } from '@/lib/r2'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase
    .from('user_profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { supabase: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { supabase, error: null }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const { title, body, lat, lng, location_name, taken_at, trip_id } = await request.json()

  const { data, error: dbError } = await supabase!
    .from('photos')
    .update({ title, body, lat, lng, location_name, taken_at, trip_id })
    .eq('id', id)
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ photo: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, error } = await requireAdmin()
  if (error) return error

  const { id } = await params

  const { data: photo } = await supabase!
    .from('photos').select('storage_key').eq('id', id).single()

  const { error: dbError } = await supabase!.from('photos').delete().eq('id', id)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  if (photo?.storage_key) {
    try {
      await deleteFromR2(photo.storage_key)
      const thumbKey = photo.storage_key.replace('photos/', 'thumbs/').replace(/\.[^.]+$/, '.jpg')
      await deleteFromR2(thumbKey)
    } catch {}
  }

  return NextResponse.json({ success: true })
}
