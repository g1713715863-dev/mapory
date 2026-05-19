import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import TripGrid from '@/components/album/TripGrid'
import type { Photo, Trip } from '@/types'

export default async function AlbumPage() {
  const supabase = await createClient()

  const [{ data: trips }, { data: photos }, { data: { user: authUser } }] = await Promise.all([
    supabase.from('trips').select('*').order('start_date', { ascending: false }),
    supabase.from('photos').select('*').order('sort_order'),
    supabase.auth.getUser(),
  ])

  let isAdmin = false
  if (authUser) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', authUser.id)
      .single()
    isAdmin = profile?.is_admin ?? false
  }

  const photosByTrip = ((photos as Photo[]) ?? []).reduce<Record<string, Photo[]>>((acc, p) => {
    if (!acc[p.trip_id]) acc[p.trip_id] = []
    acc[p.trip_id].push(p)
    return acc
  }, {})

  const tripsWithPhotos = ((trips as Trip[]) ?? []).filter((t) => (photosByTrip[t.id]?.length ?? 0) > 0)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">旅行相册</h1>
          <p className="text-stone-500 text-sm mt-1">
            {tripsWithPhotos.length} 次旅行，
            {(photos as Photo[])?.length ?? 0} 张照片
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/admin/upload"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            <Plus size={16} />
            上传照片
          </Link>
        )}
      </div>

      {tripsWithPhotos.length === 0 && (
        <div className="text-center py-24 text-stone-400">
          <div className="text-5xl mb-4">📷</div>
          <p className="mb-4">还没有照片，快去上传第一张吧！</p>
          {isAdmin && (
            <Link
              href="/admin/upload"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              <Plus size={16} />
              上传第一张照片
            </Link>
          )}
        </div>
      )}

      {tripsWithPhotos.map((trip) => (
        <TripGrid
          key={trip.id}
          trip={trip}
          photos={photosByTrip[trip.id] ?? []}
        />
      ))}
    </div>
  )
}
