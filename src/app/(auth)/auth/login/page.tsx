'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Map } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError('邮箱或密码错误'); setLoading(false); return }
      router.push('/album')
    } else if (mode === 'register') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      })
      if (error) { setError('注册失败：' + error.message); setLoading(false); return }
      setDone(true)
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      })
      if (error) { setError('发送失败：' + error.message); setLoading(false); return }
      setDone(true)
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-4">✉️</div>
          <h2 className="text-xl font-semibold text-stone-800 mb-2">
            {mode === 'forgot' ? '重置邮件已发送' : '确认邮件已发送'}
          </h2>
          <p className="text-stone-500 text-sm">
            请检查邮箱 {email}，点击邮件中的链接
            {mode === 'forgot' ? '重置密码' : '完成注册'}
          </p>
          {mode === 'forgot' && (
            <button
              onClick={() => { setMode('login'); setDone(false) }}
              className="mt-4 text-sm text-primary-500 hover:underline"
            >
              返回登录
            </button>
          )}
        </div>
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
          {mode !== 'forgot' && (
            <div className="flex rounded-xl bg-stone-100 p-1 mb-6">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    mode === m ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
                  }`}
                >
                  {m === 'login' ? '登录' : '注册'}
                </button>
              ))}
            </div>
          )}

          {mode === 'forgot' && (
            <div className="mb-5">
              <h2 className="text-base font-semibold text-stone-800">重置密码</h2>
              <p className="text-xs text-stone-500 mt-1">填写注册邮箱，我们会发送重置链接</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">昵称</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="你的名字"
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-primary-300 transition"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-primary-300 transition"
              />
            </div>
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-stone-700">密码</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError('') }}
                      className="text-xs text-primary-500 hover:underline"
                    >
                      忘记密码？
                    </button>
                  )}
                </div>
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
            )}

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              {loading ? '处理中…' : mode === 'login' ? '登录' : mode === 'register' ? '注册' : '发送重置邮件'}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => { setMode('login'); setError('') }}
                className="w-full py-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
              >
                返回登录
              </button>
            )}
          </form>
        </div>

        <p className="text-center mt-4 text-xs text-stone-400">
          注册即表示你可以在照片下留言互动
        </p>
      </div>
    </div>
  )
}
