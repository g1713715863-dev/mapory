'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Map, Images, User, LogOut, Upload, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const nav = [
  { href: '/map', label: '地图', icon: Map },
  { href: '/album', label: '相册', icon: Images },
]

interface AuthUser {
  displayName: string
  isAdmin: boolean
}

export default function Navbar() {
  const path = usePathname()
  const router = useRouter()
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()

    const loadProfile = async (uid: string) => {
      const { data } = await supabase
        .from('user_profiles')
        .select('display_name, is_admin')
        .eq('id', uid)
        .single()
      setAuthUser({
        displayName: data?.display_name ?? '用户',
        isAdmin: data?.is_admin ?? false,
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
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.push('/')
  }

  const initials = authUser?.displayName?.slice(0, 1).toUpperCase() ?? ''

  return (
    <>
      {/* 顶部导航（桌面端） */}
      <header className="hidden md:flex fixed top-0 inset-x-0 z-40 h-14 items-center justify-between px-6 bg-white/90 backdrop-blur border-b border-stone-100">
        <Link href="/" className="font-semibold text-lg tracking-tight text-stone-900">
          Mapory
        </Link>
        <nav className="flex items-center gap-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                path.startsWith(href)
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
              <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-semibold select-none group-hover:bg-primary-600 transition-colors">
                {initials}
              </div>
              <ChevronDown
                size={14}
                className={cn('text-stone-400 transition-transform duration-200', menuOpen && 'rotate-180')}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-11 bg-white border border-stone-100 rounded-2xl shadow-xl py-2 min-w-[180px] z-50">
                <div className="px-4 py-2 border-b border-stone-100 mb-1">
                  <p className="text-sm font-semibold text-stone-800">{authUser.displayName}</p>
                  {authUser.isAdmin && (
                    <span className="inline-block text-[11px] text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full mt-0.5">
                      管理员
                    </span>
                  )}
                </div>
                {authUser.isAdmin && (
                  <Link
                    href="/admin/upload"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                  >
                    <Upload size={14} />
                    上传照片
                  </Link>
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

      {/* 底部导航栏（移动端） */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around h-16 bg-white border-t border-stone-100 safe-bottom">
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
            <div className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-[11px] font-semibold">
              {initials}
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
