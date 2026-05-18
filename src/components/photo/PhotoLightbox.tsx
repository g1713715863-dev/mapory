'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, MapPin, MessageSquare } from 'lucide-react'
import type { Photo } from '@/types'
import CommentSection from '@/components/photo/CommentSection'

interface PhotoLightboxProps {
  photos: Photo[]
  initialIndex: number
  onClose: () => void
}

export default function PhotoLightbox({ photos, initialIndex, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex)
  const [showComments, setShowComments] = useState(false)
  const photo = photos[index]

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])
  const next = useCallback(() => setIndex((i) => Math.min(photos.length - 1, i + 1)), [photos.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, prev, next])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!photo) return null

  return (
    <div className="fixed inset-0 z-50 flex bg-black/95 backdrop-blur-sm">
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <X size={20} />
      </button>

      {/* 上/下张按钮 */}
      {index > 0 && (
        <button
          onClick={prev}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
      )}
      {index < photos.length - 1 && (
        <button
          onClick={next}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors md:right-14"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* 主图区 */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-12 min-w-0">
        <img
          src={photo.url}
          alt={photo.title || ''}
          className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl"
        />

        {/* 标题 + 地点 */}
        <div className="mt-4 text-center max-w-lg">
          {photo.title && (
            <h3 className="text-white font-semibold text-lg">{photo.title}</h3>
          )}
          {photo.location_name && (
            <p className="text-stone-400 text-sm mt-1 flex items-center justify-center gap-1">
              <MapPin size={13} />
              {photo.location_name}
            </p>
          )}
          {/* 长文字描述 — 在放大模式下才显示 */}
          {photo.body && (
            <p className="text-stone-300 text-sm mt-3 leading-relaxed whitespace-pre-wrap">{photo.body}</p>
          )}
        </div>

        {/* 评论按钮 */}
        <button
          onClick={() => setShowComments((v) => !v)}
          className="mt-4 flex items-center gap-1.5 text-stone-400 hover:text-white text-sm transition-colors"
        >
          <MessageSquare size={15} />
          {showComments ? '收起评论' : '查看评论'}
        </button>

        {/* 计数 */}
        <div className="mt-3 text-stone-600 text-xs">
          {index + 1} / {photos.length}
        </div>
      </div>

      {/* 侧边评论面板（桌面）/ 底部面板（移动） */}
      {showComments && (
        <aside className="
          w-full md:w-80
          fixed bottom-0 left-0 right-0 md:static
          bg-stone-900 border-t border-stone-800 md:border-t-0 md:border-l md:border-stone-800
          max-h-[50vh] md:max-h-full overflow-y-auto
        ">
          <CommentSection photoId={photo.id} />
        </aside>
      )}
    </div>
  )
}
