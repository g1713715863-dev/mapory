'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Map, Globe2, Lock, Link2, Copy, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Trip, ShareLink } from '@/types'

function origin() {
  return typeof window !== 'undefined' ? window.location.origin : ''
}

export default function TripManager({ trips }: { trips: (Trip & { photos: { count: number }[] })[] }) {
  const router = useRouter()
  const supabase = createClient()

  // ── trip creation ──────────────────────────────────────
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)

  // ── share links ────────────────────────────────────────
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [showNewShare, setShowNewShare] = useState(false)
  const [selectedTripIds, setSelectedTripIds] = useState<Set<string>>(new Set())
  const [shareLabel, setShareLabel] = useState('')
  const [shareCreating, setShareCreating] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const loadShareLinks = useCallback(async () => {
    const res = await fetch('/api/share')
    if (res.ok) setShareLinks(await res.json())
  }, [])

  useEffect(() => { loadShareLinks() }, [loadShareLinks])

  // ── trip actions ───────────────────────────────────────
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
    setCreating(false); setLoading(false)
    router.refresh()
  }

  async function deleteTrip(id: string) {
    if (!confirm('删除行程将同时删除该行程下的所有照片，确定吗？')) return
    await supabase.from('trips').delete().eq('id', id)
    router.refresh()
  }

  async function togglePublic(id: string, current: boolean) {
    await supabase.from('trips').update({ is_public: !current }).eq('id', id)
    router.refresh()
  }

  // ── share link actions ─────────────────────────────────
  async function createShareLink() {
    if (selectedTripIds.size === 0) return
    setShareCreating(true)
    await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip_ids: [...selectedTripIds], label: shareLabel }),
    })
    setShowNewShare(false); setSelectedTripIds(new Set()); setShareLabel('')
    setShareCreating(false)
    loadShareLinks()
  }

  async function deleteShareLink(token: string) {
    await fetch(`/api/share/${token}`, { method: 'DELETE' })
    loadShareLinks()
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${origin()}/share/${token}`)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  function toggleSelectTrip(id: string) {
    setSelectedTripIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const tripById = Object.fromEntries(trips.map(t => [t.id, t]))

  return (
    <div className="space-y-8">
      {/* ── Trip list ────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide">行程</h2>

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
            <div className="flex items-center gap-1">
              {/* Public / private toggle */}
              <button
                onClick={() => togglePublic(trip.id, trip.is_public)}
                title={trip.is_public ? '公开（点击改为私密）' : '私密（点击改为公开）'}
                className={`p-2 rounded-lg transition-colors ${
                  trip.is_public
                    ? 'text-emerald-500 hover:bg-emerald-50'
                    : 'text-stone-300 hover:bg-stone-100 hover:text-stone-500'
                }`}
              >
                {trip.is_public ? <Globe2 size={16} /> : <Lock size={16} />}
              </button>
              <button
                onClick={() => deleteTrip(trip.id)}
                className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {/* Create trip */}
        {creating ? (
          <div className="bg-white rounded-xl p-4 border border-primary-200 space-y-3">
            <input autoFocus value={name} onChange={e => setName(e.target.value)}
              placeholder="行程名称（必填）"
              className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:ring-1 focus:ring-primary-300" />
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="描述（选填）"
              className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:ring-1 focus:ring-primary-300" />
            <div className="flex gap-2">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:ring-1 focus:ring-primary-300" />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:ring-1 focus:ring-primary-300" />
            </div>
            <div className="flex gap-2">
              <button onClick={create} disabled={loading || !name.trim()}
                className="flex-1 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors">
                {loading ? '创建中…' : '创建行程'}
              </button>
              <button onClick={() => setCreating(false)}
                className="px-4 py-2 rounded-lg bg-stone-100 text-stone-600 text-sm hover:bg-stone-200 transition-colors">
                取消
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 border-dashed border-stone-200 text-stone-500 hover:border-primary-300 hover:text-primary-600 transition-colors text-sm">
            <Plus size={16} /> 新建行程
          </button>
        )}
      </div>

      {/* ── Share links ──────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide">分享链接</h2>
          {!showNewShare && (
            <button onClick={() => setShowNewShare(true)}
              className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium">
              <Plus size={13} /> 新建
            </button>
          )}
        </div>

        {/* Existing share links */}
        {shareLinks.length === 0 && !showNewShare && (
          <p className="text-sm text-stone-400 py-2">暂无分享链接</p>
        )}
        {shareLinks.map(link => (
          <div key={link.id} className="bg-white rounded-xl p-4 border border-stone-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 size={14} className="text-stone-400" />
                <span className="text-sm font-medium text-stone-700">{link.label || '未命名链接'}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => copyLink(link.token)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-stone-500 hover:bg-stone-100 transition-colors">
                  {copiedToken === link.token ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  {copiedToken === link.token ? '已复制' : '复制链接'}
                </button>
                <button onClick={() => deleteShareLink(link.token)}
                  className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <p className="text-xs text-stone-400 truncate">
              {link.trip_ids.map(id => tripById[id]?.name).filter(Boolean).join('、')}
            </p>
            <p className="text-xs text-stone-300 font-mono truncate">
              {origin()}/share/{link.token}
            </p>
          </div>
        ))}

        {/* New share link form */}
        {showNewShare && (
          <div className="bg-white rounded-xl p-4 border border-primary-200 space-y-3">
            <input value={shareLabel} onChange={e => setShareLabel(e.target.value)}
              placeholder="链接备注（如：家人分享）"
              className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:ring-1 focus:ring-primary-300" />
            <div className="space-y-1.5">
              <p className="text-xs text-stone-500">选择要包含的行程：</p>
              {trips.map(trip => (
                <label key={trip.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <input type="checkbox"
                    checked={selectedTripIds.has(trip.id)}
                    onChange={() => toggleSelectTrip(trip.id)}
                    className="w-4 h-4 rounded accent-primary-500" />
                  <span className="text-sm text-stone-700 group-hover:text-stone-900">{trip.name}</span>
                  <span className="text-xs text-stone-400">
                    {trip.photos?.[0]?.count ? `${trip.photos[0].count} 张` : ''}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={createShareLink} disabled={shareCreating || selectedTripIds.size === 0}
                className="flex-1 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors">
                {shareCreating ? '生成中…' : `生成链接（${selectedTripIds.size} 个行程）`}
              </button>
              <button onClick={() => { setShowNewShare(false); setSelectedTripIds(new Set()); setShareLabel('') }}
                className="px-3 py-2 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
