'use client'

import { useState } from 'react'
import { X, Check, MapPin, Loader, Trash2 } from 'lucide-react'
import type { Photo, Trip } from '@/types'
import LocationPickerModal from './LocationPickerModal'

interface PhotoEditModalProps {
  photo: Photo
  trips: Trip[]
  onClose: () => void
  onSave: () => void
  onDelete: () => void
}

export default function PhotoEditModal({ photo, trips, onClose, onSave, onDelete }: PhotoEditModalProps) {
  const [title, setTitle] = useState(photo.title ?? '')
  const [body, setBody] = useState(photo.body ?? '')
  const [lat, setLat] = useState(photo.lat)
  const [lng, setLng] = useState(photo.lng)
  const [locationName, setLocationName] = useState(photo.location_name ?? '')
  const [takenAt, setTakenAt] = useState(
    photo.taken_at ? new Date(photo.taken_at).toISOString().slice(0, 16) : ''
  )
  const [tripId, setTripId] = useState(photo.trip_id)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/photos/${photo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title || null,
        body: body || null,
        lat,
        lng,
        location_name: locationName || null,
        taken_at: takenAt ? new Date(takenAt).toISOString() : null,
        trip_id: tripId,
      }),
    })
    setSaving(false)
    if (res.ok) onSave()
  }

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/photos/${photo.id}`, { method: 'DELETE' })
    setDeleting(false)
    onDelete()
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 sticky top-0 bg-white z-10">
            <h3 className="font-medium text-stone-800">编辑照片信息</h3>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-700 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <img
              src={photo.thumbnail_url || photo.url}
              alt=""
              className="w-full h-36 object-cover rounded-xl"
            />

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="标题（始终显示）"
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 outline-none focus:ring-1 focus:ring-primary-300"
            />

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="描述（可选）"
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 outline-none focus:ring-1 focus:ring-primary-300 resize-none"
            />

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <MapPin size={13} className={lat ? 'text-primary-500' : 'text-stone-300'} />
                <input
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder={lat ? `${lat.toFixed(4)}, ${lng?.toFixed(4)}` : '地点名称'}
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 outline-none focus:ring-1 focus:ring-primary-300"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  lat
                    ? 'border-primary-200 text-primary-600 bg-primary-50 hover:bg-primary-100'
                    : 'border-stone-200 text-stone-500 bg-white hover:border-primary-300 hover:text-primary-600'
                }`}
              >
                <MapPin size={12} />
                {lat ? '已定位，点击修改' : '在地图上标注位置'}
              </button>
            </div>

            <div>
              <label className="text-xs text-stone-500 mb-1 block">拍摄时间</label>
              <input
                type="datetime-local"
                value={takenAt}
                onChange={(e) => setTakenAt(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 outline-none focus:ring-1 focus:ring-primary-300"
              />
            </div>

            <select
              value={tripId}
              onChange={(e) => setTripId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 outline-none focus:ring-1 focus:ring-primary-300 bg-white"
            >
              {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            <div className="flex gap-2 pt-1">
              {confirmDelete ? (
                <>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {deleting ? <><Loader size={14} className="animate-spin" /> 删除中…</> : '确认删除'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="p-2.5 rounded-xl border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-1.5 hover:bg-primary-600 transition-colors"
                  >
                    {saving ? <><Loader size={14} className="animate-spin" /> 保存中…</> : <><Check size={14} /> 保存</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPicker && (
        <LocationPickerModal
          initialLat={lat}
          initialLng={lng}
          onConfirm={(newLat, newLng, newName) => {
            setLat(newLat)
            setLng(newLng)
            if (newName) setLocationName(newName)
            setShowPicker(false)
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  )
}
