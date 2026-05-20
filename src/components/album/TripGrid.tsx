'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Calendar, Pencil } from 'lucide-react'

function thumbSrc(photo: import('@/types').Photo) {
  if (photo.thumbnail_url) return photo.thumbnail_url
  if (/\.(heic|heif)$/i.test(photo.url)) return `/api/photos/${photo.id}/jpeg?size=thumb`
  return photo.url
}
import type { Photo, Trip } from '@/types'
import PhotoLightbox from '@/components/photo/PhotoLightbox'
import PhotoEditModal from '@/components/photo/PhotoEditModal'
import { formatDate } from '@/lib/utils'

interface TripGridProps {
  trip: Trip
  photos: Photo[]
  allTrips: Trip[]
  isAdmin: boolean
}

function dayLabel(photo: Photo): string | null {
  if (!photo.taken_at) return null
  return new Date(photo.taken_at).toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

export default function TripGrid({ trip, photos, allTrips, isAdmin }: TripGridProps) {
  const router = useRouter()
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [editPhoto, setEditPhoto] = useState<Photo | null>(null)

  // Group photos by day (taken_at date)
  const dayGroups: Array<{ label: string | null; photos: Photo[] }> = []
  for (const photo of photos) {
    const label = dayLabel(photo)
    const last = dayGroups[dayGroups.length - 1]
    if (last && last.label === label) last.photos.push(photo)
    else dayGroups.push({ label, photos: [photo] })
  }

  return (
    <section>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">{trip.name}</h2>
          <div className="flex items-center gap-3 mt-1 text-sm text-stone-500">
            {trip.start_date && (
              <span className="flex items-center gap-1">
                <Calendar size={13} />
                {formatDate(trip.start_date)}
                {trip.end_date && trip.end_date !== trip.start_date && (
                  <> — {formatDate(trip.end_date)}</>
                )}
              </span>
            )}
            <span>{photos.length} 张照片</span>
          </div>
          {trip.description && (
            <p className="mt-1 text-sm text-stone-500 max-w-lg">{trip.description}</p>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {dayGroups.map(({ label, photos: dayPhotos }, gi) => (
          <div key={gi}>
            {/* Day header — only show if multiple days and label exists */}
            {dayGroups.length > 1 && label && (
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs text-stone-400 font-medium whitespace-nowrap">{label}</span>
                <span className="h-px flex-1 bg-stone-100" />
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {dayPhotos.map((photo) => {
                const idx = photos.indexOf(photo)
                return (
                  <div key={photo.id} className="relative group">
                    <button
                      onClick={() => setLightboxIndex(idx)}
                      className="photo-card relative aspect-square rounded-xl overflow-hidden bg-stone-100 w-full block"
                    >
                      <img
                        src={thumbSrc(photo)}
                        alt={photo.title || ''}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {photo.title && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs font-medium truncate">{photo.title}</p>
                        </div>
                      )}
                      {photo.location_name && (
                        <div className="absolute top-1.5 left-1.5">
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/30 text-white text-[10px] backdrop-blur-sm">
                            <MapPin size={9} />
                            <span className="truncate max-w-[80px]">{photo.location_name}</span>
                          </span>
                        </div>
                      )}
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => setEditPhoto(photo)}
                        className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/65"
                        title="编辑"
                      >
                        <Pencil size={11} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {editPhoto && (
        <PhotoEditModal
          photo={editPhoto}
          trips={allTrips}
          onClose={() => setEditPhoto(null)}
          onSave={() => { setEditPhoto(null); router.refresh() }}
          onDelete={() => { setEditPhoto(null); router.refresh() }}
        />
      )}
    </section>
  )
}
