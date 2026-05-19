'use client'

import { useState, useRef } from 'react'
import { Upload, MapPin, X, Check, Loader } from 'lucide-react'
import type { Trip } from '@/types'
import LocationPickerModal from './LocationPickerModal'

interface UploadFormProps {
  trips: Trip[]
  onSuccess: () => void
}

interface ParsedPhoto {
  id: string
  file: File
  preview: string
  lat: number | null
  lng: number | null
  takenAt: string | null
  title: string
  body: string
  locationName: string
  tripId: string
  converting: boolean
}

export default function UploadForm({ trips, onSuccess }: UploadFormProps) {
  const [photos, setPhotos] = useState<ParsedPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(0)
  const [pickerIdx, setPickerIdx] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files) return
    const exifr = (await import('exifr')).default
    const defaultTripId = trips[0]?.id ?? ''

    const newPhotos: ParsedPhoto[] = await Promise.all(
      Array.from(files).map(async (file) => {
        const id = crypto.randomUUID()
        const isHeic = /\.(heic|heif)$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif'

        // Quick EXIF thumbnail for immediate preview
        let preview = ''
        if (isHeic) {
          try {
            const buf = await exifr.thumbnail(file)
            if (buf) preview = URL.createObjectURL(new Blob([buf.buffer as ArrayBuffer], { type: 'image/jpeg' }))
          } catch {}
        } else {
          preview = URL.createObjectURL(file)
        }

        let lat = null, lng = null, takenAt = null
        try {
          const gps = await exifr.gps(file)
          if (gps) { lat = gps.latitude; lng = gps.longitude }
          const exif = await exifr.parse(file, ['DateTimeOriginal'])
          if (exif?.DateTimeOriginal) takenAt = exif.DateTimeOriginal.toISOString()
        } catch {}

        return { id, file, preview, lat, lng, takenAt, title: '', body: '', locationName: '', tripId: defaultTripId, converting: isHeic }
      })
    )

    setPhotos((prev) => [...prev, ...newPhotos])

    // Background HEIC → JPEG conversion (replaces the upload file and improves preview)
    for (const photo of newPhotos) {
      if (!photo.converting) continue
      ;(async () => {
        try {
          const heic2any = (await import('heic2any')).default
          const result = await heic2any({ blob: photo.file, toType: 'image/jpeg', quality: 0.92 })
          const jpegBlob = (Array.isArray(result) ? result[0] : result) as Blob
          const jpegFile = new File(
            [jpegBlob],
            photo.file.name.replace(/\.(heic|heif)$/i, '.jpg'),
            { type: 'image/jpeg' }
          )
          const newPreview = URL.createObjectURL(jpegBlob)
          setPhotos((prev) => prev.map((p) => {
            if (p.id !== photo.id) return p
            if (p.preview) URL.revokeObjectURL(p.preview)
            return { ...p, file: jpegFile, preview: newPreview, converting: false }
          }))
        } catch {
          setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, converting: false } : p))
        }
      })()
    }
  }

  function updatePhoto(id: string, updates: Partial<ParsedPhoto>) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target?.preview) URL.revokeObjectURL(target.preview)
      return prev.filter((p) => p.id !== id)
    })
  }

  function handleLocationConfirm(lat: number, lng: number, locationName: string) {
    if (pickerIdx === null) return
    const photo = photos[pickerIdx]
    updatePhoto(photo.id, { lat, lng, locationName: locationName || photo.locationName })
    setPickerIdx(null)
  }

  async function handleUpload() {
    setUploading(true)
    setDone(0)
    for (const photo of photos) {
      const form = new FormData()
      form.append('file', photo.file)
      form.append('trip_id', photo.tripId)
      if (photo.title) form.append('title', photo.title)
      if (photo.body) form.append('body', photo.body)
      if (photo.lat != null) form.append('lat', String(photo.lat))
      if (photo.lng != null) form.append('lng', String(photo.lng))
      if (photo.locationName) form.append('location_name', photo.locationName)
      if (photo.takenAt) form.append('taken_at', photo.takenAt)
      await fetch('/api/upload', { method: 'POST', body: form })
      setDone((d) => d + 1)
    }
    setPhotos([])
    setUploading(false)
    onSuccess()
  }

  const isConverting = photos.some((p) => p.converting)

  return (
    <>
      <div className="space-y-4">
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-stone-200 rounded-2xl p-8 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/40 transition-colors"
        >
          <Upload size={32} className="mx-auto text-stone-400 mb-2" />
          <p className="text-stone-600 font-medium">点击或拖拽照片上传</p>
          <p className="text-stone-400 text-xs mt-1">支持 JPG、HEIC，将自动读取拍摄地点</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {photos.map((photo, idx) => (
          <div key={photo.id} className="flex gap-3 bg-stone-50 rounded-2xl p-3 border border-stone-100">
            {/* 预览图 + 转换进度 */}
            <div className="relative w-24 h-24 shrink-0">
              {photo.preview ? (
                <img src={photo.preview} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="w-full h-full rounded-xl bg-stone-100 border border-stone-200" />
              )}
              {photo.converting && (
                <div className="absolute inset-0 rounded-xl bg-black/35 flex flex-col items-center justify-center gap-1">
                  <Loader size={16} className="text-white animate-spin" />
                  <span className="text-white text-[9px] font-medium">转换中</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 truncate max-w-[160px]">{photo.file.name}</span>
                <button onClick={() => removePhoto(photo.id)} className="text-stone-400 hover:text-red-500">
                  <X size={16} />
                </button>
              </div>
              <input
                value={photo.title}
                onChange={(e) => updatePhoto(photo.id, { title: e.target.value })}
                placeholder="短标题（始终显示）"
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-stone-200 outline-none focus:ring-1 focus:ring-primary-300 bg-white"
              />
              <textarea
                value={photo.body}
                onChange={(e) => updatePhoto(photo.id, { body: e.target.value })}
                placeholder="记录心得、故事…（仅详情页显示）"
                rows={2}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 outline-none focus:ring-1 focus:ring-primary-300 bg-white resize-none leading-relaxed"
              />

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} className={photo.lat ? 'text-primary-500' : 'text-stone-300'} />
                  <input
                    value={photo.locationName}
                    onChange={(e) => updatePhoto(photo.id, { locationName: e.target.value })}
                    placeholder={photo.lat ? `${photo.lat.toFixed(4)}, ${photo.lng?.toFixed(4)}` : '手动填写地点名称'}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 outline-none focus:ring-1 focus:ring-primary-300 bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setPickerIdx(idx)}
                  className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    photo.lat
                      ? 'border-primary-200 text-primary-600 bg-primary-50 hover:bg-primary-100'
                      : 'border-stone-200 text-stone-500 bg-white hover:border-primary-300 hover:text-primary-600'
                  }`}
                >
                  {photo.lat ? (
                    <><Check size={12} /> 已定位，点击修改</>
                  ) : (
                    <><MapPin size={12} /> 在地图上标注位置</>
                  )}
                </button>
              </div>

              <select
                value={photo.tripId}
                onChange={(e) => updatePhoto(photo.id, { tripId: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 outline-none focus:ring-1 focus:ring-primary-300 bg-white"
              >
                {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
        ))}

        {photos.length > 0 && (
          <button
            onClick={handleUpload}
            disabled={uploading || isConverting}
            className="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <><Loader size={16} className="animate-spin" /> 上传中 {done}/{photos.length}</>
            ) : isConverting ? (
              <><Loader size={16} className="animate-spin" /> 正在处理 HEIC 文件…</>
            ) : (
              <><Upload size={16} /> 上传 {photos.length} 张照片</>
            )}
          </button>
        )}
      </div>

      {pickerIdx !== null && (
        <LocationPickerModal
          initialLat={photos[pickerIdx]?.lat}
          initialLng={photos[pickerIdx]?.lng}
          onConfirm={handleLocationConfirm}
          onClose={() => setPickerIdx(null)}
        />
      )}
    </>
  )
}
