import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import TripGrid from '@/components/album/TripGrid'
import SortToggle from '@/components/album/SortToggle'
import type { Photo, Trip } from '@/types'

type Props = {
  searchParams: Promise<{ order?: string }>
}

export default async function AlbumPage({ searchParams }: Props) {
  const { order: orderParam } = await searchParams
  const order: 'asc' | 'desc' = orderParam === 'asc' ? 'asc' : 'desc'

  const supabase = await createClient()

  const [{ data: trips }, { data: photos }, { data: { user: authUser } }] = await Promise.all([
    supabase.from('trips').select('*').order('start_date', { ascending: false }),
    supabase.from('photos').select('*'),
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

  // Sort photos within each trip by taken_at, direction based on order param
  for (const tripId in photosByTrip) {
    photosByTrip[tripId].sort((a, b) => {
      const da = a.taken_at ?? a.created_at
      const db = b.taken_at ?? b.created_at
      const cmp = da < db ? -1 : da > db ? 1 : 0
      return order === 'asc' ? cmp : -cmp
    })
  }

  const allTripsWithPhotos = ((trips as Trip[]) ?? []).filter((t) => (photosByTrip[t.id]?.length ?? 0) > 0)
  // Trips from Supabase are newest-first; for asc we reverse
  const tripsWithPhotos = order === 'asc' ? [...allTripsWithPhotos].reverse() : allTripsWithPhotos

  // Resolve year for a trip: prefer start_date, fall back to earliest photo taken_at
  function tripYear(trip: Trip): string {
    if (trip.start_date) return new Date(trip.start_date).getFullYear().toString()
    const dates = (photosByTrip[trip.id] ?? []).map((p) => p.taken_at).filter(Boolean) as string[]
    if (dates.length > 0) return new Date(dates.sort()[0]).getFullYear().toString()
    return '未知年份'
  }

  // Group trips by year
  const tripGroups: Array<{ year: string; trips: Trip[] }> = []
  for (const trip of tripsWithPhotos) {
    const year = tripYear(trip)
    const last = tripGroups[tripGroups.length - 1]
    if (last?.year === year) last.trips.push(trip)
    else tripGroups.push({ year, trips: [trip] })
  }

  const totalPhotos = (photos as Photo[])?.length ?? 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">旅行相册</h1>
          <p className="text-stone-500 text-sm mt-1">
            {tripsWithPhotos.length} 次旅行，{totalPhotos} 张照片
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SortToggle order={order} />
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
      </div>

      {tripsWithPhotos.length === 0 ? (
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
      ) : (
        <div className="relative">
          {/* Timeline vertical line */}
          <div className="absolute left-[18px] top-8 bottom-8 w-px bg-stone-200" />

          {tripGroups.map(({ year, trips: yearTrips }) => (
            <div key={year} className="mb-2">
              {/* Year node */}
              <div className="flex items-center gap-5 mb-8">
                <div className="w-9 shrink-0 flex justify-center">
                  <div className="w-8 h-8 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center shadow-sm z-10">
                    {year !== '未知年份' ? year.slice(-2) : '?'}
                  </div>
                </div>
                <span className="text-xl font-bold text-stone-600">{year} 年</span>
              </div>

              {yearTrips.map((trip) => (
                <div key={trip.id} className="flex gap-5 mb-14">
                  <div className="w-9 shrink-0 flex justify-center pt-2">
                    <div className="w-3 h-3 rounded-full bg-white border-2 border-primary-400 shadow-sm z-10" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <TripGrid
                      trip={trip}
                      photos={photosByTrip[trip.id] ?? []}
                      allTrips={(trips as Trip[]) ?? []}
                      isAdmin={isAdmin}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
