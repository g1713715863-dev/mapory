import { notFound } from 'next/navigation'
import TripGrid from '@/components/album/TripGrid'
import type { Photo, Trip } from '@/types'

type Props = { params: Promise<{ token: string }> }

export default async function SharePage({ params }: Props) {
  const { token } = await params

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  const res = await fetch(`${baseUrl}/api/share/${token}`, { cache: 'no-store' })
  if (!res.ok) notFound()
  const { link, trips, photos } = await res.json()

  const photosByTrip = ((photos as Photo[]) ?? []).reduce<Record<string, Photo[]>>((acc, p) => {
    if (!acc[p.trip_id]) acc[p.trip_id] = []
    acc[p.trip_id].push(p)
    return acc
  }, {})

  const tripsWithPhotos = (trips as Trip[]).filter(t => (photosByTrip[t.id]?.length ?? 0) > 0)

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Simple header */}
      <header className="bg-white border-b border-stone-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-stone-900 font-semibold text-lg">Mapory</span>
          <span className="text-stone-300">·</span>
          <span className="text-stone-500 text-sm">{link.label || '旅行相册'}</span>
        </div>
        <a
          href="/"
          className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
        >
          创建你的旅行地图 →
        </a>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {tripsWithPhotos.length === 0 ? (
          <div className="text-center py-24 text-stone-400">
            <div className="text-5xl mb-4">📷</div>
            <p>该相册暂无照片</p>
          </div>
        ) : (
          <div className="space-y-12">
            {tripsWithPhotos.map(trip => (
              <TripGrid
                key={trip.id}
                trip={trip}
                photos={photosByTrip[trip.id] ?? []}
                allTrips={tripsWithPhotos}
                isAdmin={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
