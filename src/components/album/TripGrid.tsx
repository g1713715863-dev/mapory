'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MapPin, Calendar } from 'lucide-react'
import type { Photo, Trip } from '@/types'
import PhotoLightbox from '@/components/photo/PhotoLightbox'
import { formatDate } from '@/lib/utils'

interface TripGridProps {
  trip: Trip
  photos: Photo[]
}

export default function TripGrid({ trip, photos }: TripGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  return (
    <section>
      {/* 行程标题 */}
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

      {/* 照片网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {photos.map((photo, idx) => (
          <button
            key={photo.id}
            onClick={() => setLightboxIndex(idx)}
            className="photo-card relative aspect-square rounded-xl overflow-hidden bg-stone-100 group"
          >
            <img
              src={photo.thumbnail_url || photo.url}
              alt={photo.title || ''}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {/* 标题 overlay */}
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
        ))}
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  )
}
