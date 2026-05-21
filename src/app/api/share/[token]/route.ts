import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profile } = await supabase
    .from('user_profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { error: null }
}

// GET — fetch share link data for public share page (no auth needed)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const service = createServiceClient()

  const { data: link } = await service
    .from('share_links')
    .select('*')
    .eq('token', token)
    .single()
  if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [{ data: trips }, { data: photos }] = await Promise.all([
    service.from('trips').select('*').in('id', link.trip_ids),
    service.from('photos').select('*').in('trip_id', link.trip_ids),
  ])

  return NextResponse.json({ link, trips: trips ?? [], photos: photos ?? [] })
}

// DELETE — remove a share link (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error
  const { token } = await params
  const supabase = await createClient()
  await supabase.from('share_links').delete().eq('token', token)
  return NextResponse.json({ ok: true })
}
