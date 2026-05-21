import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase
    .from('user_profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { supabase: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { supabase, error: null }
}

// GET — list all share links (admin only)
export async function GET() {
  const { supabase, error } = await requireAdmin()
  if (error) return error
  const { data } = await supabase!.from('share_links').select('*').order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

// POST — create a share link (admin only)
export async function POST(req: NextRequest) {
  const { supabase, error } = await requireAdmin()
  if (error) return error
  const { trip_ids, label } = await req.json()
  if (!Array.isArray(trip_ids) || trip_ids.length === 0) {
    return NextResponse.json({ error: 'trip_ids required' }, { status: 400 })
  }
  const { data, error: dbErr } = await supabase!
    .from('share_links')
    .insert({ trip_ids, label: label ?? '' })
    .select()
    .single()
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}
