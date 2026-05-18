'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Map } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Trip } from '@/types'

export default function TripManager({ trips }: { trips: (Trip & { photos: { count: number }[] })[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)

  async function create() {
    if (!name.trim()) return
    setLoading(true)
    await supabase.from('trips').insert({
      name: name.trim(),
      description: description.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
    })
    setName(''); setDescription(''); setStartDate(''); setEndDate('')
    setCreating(false)
    setLoading(false)
    router.refresh()
  }

  async function deleteTrip(id: string) {
    if (!confirm('删除行程将同时删除该行程下的所有照片，确定吗？')) return
    await supabase.from('trips').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* 行程列表 */}
      {trips.map((trip) => (
        <div key={trip.id} className="flex items-center justify-between bg-white rounded-xl p-4 border border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Map size={18} className="text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-stone-800">{trip.name}</p>
              <p className="text-xs text-stone-400">
                {trip.start_date || '—'}
                {trip.photos?.[0]?.count ? ` · ${trip.photos[0].count} 张照片` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => deleteTrip(trip.id)}
            className="p-2 text-stone-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      {/* 创建新行程 */}
      {creating ? (
        <div className="bg-white rounded-xl p-4 border border-primary-200 space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="行程名称（必填）"
            className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:ring-1 focus:ring-primary-300"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述（选填）"
            className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:ring-1 focus:ring-primary-300"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:ring-1 focus:ring-primary-300"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:ring-1 focus:ring-primary-300"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={create}
              disabled={loading || !name.trim()}
              className="flex-1 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {loading ? '创建中…' : '创建行程'}
            </button>
            <button
              onClick={() => setCreating(false)}
              className="px-4 py-2 rounded-lg bg-stone-100 text-stone-600 text-sm hover:bg-stone-200 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 border-dashed border-stone-200 text-stone-500 hover:border-primary-300 hover:text-primary-600 transition-colors text-sm"
        >
          <Plus size={16} />
          新建行程
        </button>
      )}
    </div>
  )
}
