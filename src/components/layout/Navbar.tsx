'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Map, Images, User, LogOut, Upload, ChevronDown, Camera, Loader, Pencil, Check, X, Route, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const nav = [
  { href: '/map', label: '地图', icon: Map },
  { href: '/album', label: '相册', icon: Images },
]

interface AuthUser {
  id: string
  displayName: string
  isAdmin: boolean
  avatarUrl: string | null
}

export default function Navbar() {
  const path = usePathname()
  const router = useRouter()
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()

    const loadProfile = async (uid: string) => {
      // select('*') is resilient: won't error if avatar_url column doesn't exist yet
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', uid)
        .single()
      const row = data as Record<string, unknown> | null
      setAuthUser({
        id: uid,
        displayName: (row?.display_name as string) ?? '用户',
        isAdmin: (row?.is_admin as boolean) ?? false,
        avatarUrl: (row?.avatar_url as string) ?? null,
      })
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) loadProfile(session.user.id)
      else setAuthUser(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setEditingName(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus()
  }, [editingName])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.push('/')
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/avatar', { method: 'POST', body: form })
      if (res.ok) {
        const { url } = await res.json()
        setAuthUser((prev) => prev ? { ...prev, avatarUrl: url } : prev)
      }
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function startEditName() {
    setNameInput(authUser?.displayName ?? '')
    setEditingName(true)
  }

  function cancelEditName() {
    setEditingName(false)
    setNameInput('')
  }

  async function saveDisplayName() {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === authUser?.displayName) {
      cancelEditName()
      return
    }
    setSavingName(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('user_profiles')
      .update({ display_name: trimmed })
      .eq('id', authUser!.id)
    if (!error) {
      setAuthUser((prev) => prev ? { ...prev, displayName: trimmed } : prev)
    }
    setSavingName(false)
    setEditingName(false)
  }

  const initials = authUser?.displayName?.slice(0, 1).toUpperCase() ?? ''

  function AvatarImg({ className }: { className: string }) {
    return authUser?.avatarUrl ? (
      <img src={authUser.avatarUrl} alt="" className={`${className} rounded-full object-cover`} />
    ) : (
      <div className={`${className} rounded-full bg-primary-500 text-white flex items-center justify-center font-semibold select-none`}>
        {initials}
      </div>
    )
  }

  const isHome = path === '/'

  return (
    <>
      {/* 顶部导航（桌面端） */}
      <header className={cn(
        'hidden md:flex fixed top-0 inset-x-0 z-40 h-14 items-center justify-between px-6 transition-colors duration-300',
        isHome
          ? 'bg-transparent border-b border-white/10'
          : 'bg-white/90 backdrop-blur border-b border-stone-100'
      )}>
        <Link href="/" className={cn(
          'font-semibold text-lg tracking-tight',
          isHome ? 'text-white/80' : 'text-stone-900'
        )}>
          Mapory
        </Link>
        <nav className="flex items-center gap-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                isHome
                  ? path.startsWith(href)
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                  : path.startsWith(href)
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>

        {authUser ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 group"
            >
              <div className="w-8 h-8 group-hover:opacity-90 transition-opacity overflow-hidden rounded-full">
                <AvatarImg className="w-8 h-8" />
              </div>
              <ChevronDown
                size={14}
                className={cn('text-stone-400 transition-transform duration-200', menuOpen && 'rotate-180')}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-11 bg-white border border-stone-100 rounded-2xl shadow-xl py-2 min-w-[220px] z-50">

                {/* 头像 + 昵称 */}
                <div className="px-4 py-3 border-b border-stone-100 mb-1 flex items-center gap-3">
                  {/* 头像（悬停可上传） */}
                  <div className="relative group/avatar shrink-0">
                    <div className="w-12 h-12 overflow-hidden rounded-full">
                      <AvatarImg className="w-12 h-12" />
                    </div>
                    <label className="absolute inset-0 rounded-full cursor-pointer flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors">
                      {uploading ? (
                        <Loader size={15} className="text-white animate-spin" />
                      ) : (
                        <Camera size={15} className="text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                        disabled={uploading}
                      />
                    </label>
                  </div>

                  {/* 昵称（可编辑） */}
                  <div className="min-w-0 flex-1">
                    {editingName ? (
                      <div className="flex items-center gap-1">
                        <input
                          ref={nameInputRef}
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveDisplayName()
                            if (e.key === 'Escape') cancelEditName()
                          }}
                          className="text-sm font-semibold text-stone-800 border-b border-primary-400 outline-none bg-transparent w-full"
                          maxLength={20}
                        />
                        <button
                          onClick={saveDisplayName}
                          disabled={savingName}
                          className="shrink-0 text-primary-500 hover:text-primary-600 disabled:opacity-40"
                        >
                          {savingName ? <Loader size={13} className="animate-spin" /> : <Check size={13} />}
                        </button>
                        <button onClick={cancelEditName} className="shrink-0 text-stone-400 hover:text-stone-600">
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group/name">
                        <p className="text-sm font-semibold text-stone-800 truncate">{authUser.displayName}</p>
                        <button
                          onClick={startEditName}
                          className="shrink-0 opacity-0 group-hover/name:opacity-100 transition-opacity text-stone-400 hover:text-stone-600"
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    )}
                    {authUser.isAdmin && (
                      <span className="inline-block text-[11px] text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full mt-0.5">
                        管理员
                      </span>
                    )}
                  </div>
                </div>

                {authUser.isAdmin && (
                  <>
                    <Link
                      href="/admin/upload"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                    >
                      <Upload size={14} />
                      上传照片
                    </Link>
                    <Link
                      href="/admin/trips"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                    >
                      <Route size={14} />
                      管理行程
                    </Link>
                    <Link
                      href="/admin/comments"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                    >
                      <MessageSquare size={14} />
                      评论管理
                    </Link>
                  </>
                )}
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-red-500 transition-colors"
                >
                  <LogOut size={14} />
                  退出登录
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/auth/login"
            className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors"
          >
            <User size={16} />
            登录
          </Link>
        )}
      </header>

      {/* 底部导航栏（移动端，首页隐藏） */}
      <nav className={cn('md:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around h-16 bg-white border-t border-stone-100 safe-bottom', isHome && 'hidden')}>
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-6 py-1 rounded-xl transition-colors',
              path.startsWith(href)
                ? 'text-primary-600'
                : 'text-stone-400 hover:text-stone-700'
            )}
          >
            <Icon size={22} strokeWidth={path.startsWith(href) ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}

        {authUser ? (
          <button
            onClick={handleSignOut}
            className="flex flex-col items-center gap-0.5 px-6 py-1 rounded-xl text-stone-400 hover:text-stone-700 transition-colors"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden">
              <AvatarImg className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-medium">退出</span>
          </button>
        ) : (
          <Link
            href="/auth/login"
            className={cn(
              'flex flex-col items-center gap-0.5 px-6 py-1 rounded-xl transition-colors',
              path.startsWith('/auth')
                ? 'text-primary-600'
                : 'text-stone-400 hover:text-stone-700'
            )}
          >
            <User size={22} strokeWidth={path.startsWith('/auth') ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">我的</span>
          </Link>
        )}
      </nav>
    </>
  )
}
