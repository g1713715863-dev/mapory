'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Map } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    // PKCE flow: code is in query params
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setExpired(true)
        else setReady(true)
      })
    } else {
      // Already have session (e.g. navigated back)
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setReady(true)
        else setExpired(true)
      })
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('两次输入的密码不一致'); return }
    if (password.length < 6) { setError('密码至少 6 位'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError('设置失败：' + error.message); setLoading(false); return }
    router.push('/album')
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-stone-800 mb-2">链接已失效</h2>
          <p className="text-stone-500 text-sm mb-4">重置链接只能使用一次，请重新申请</p>
          <Link href="/auth/login" className="text-primary-500 hover:underline text-sm">
            返回登录页重新申请
          </Link>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-stone-500 text-sm">验证中…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-stone-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-semibold text-stone-900">
            <Map size={24} className="text-primary-500" />
            Mapory
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <h2 className="text-base font-semibold text-stone-800 mb-1">设置新密码</h2>
          <p className="text-xs text-stone-500 mb-5">请输入你的新密码，至少 6 位</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">新密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                required
                minLength={6}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-primary-300 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">确认密码</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="再输入一次"
                required
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-primary-300 transition"
              />
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              {loading ? '保存中…' : '保存新密码'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
