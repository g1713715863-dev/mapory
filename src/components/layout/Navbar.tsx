'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Map, Images, User, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const nav = [
  { href: '/map', label: '地图', icon: Map },
  { href: '/album', label: '相册', icon: Images },
]

export default function Navbar() {
  const path = usePathname()
  const router = useRouter()
  const [displayName, setDisplayName] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const loadProfile = async (uid: string) => {
      const { data } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('id', uid)
        .single()
      setDisplayName(data?.display_name ?? null)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) loadProfile(session.user.id)
      else setDisplayName(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const isLoggedIn = displayName !== null

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

        {isLoggedIn ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-600">{displayName}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-700 transition-colors"
            >
              <LogOut size={15} />
              退出
            </button>
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

        {isLoggedIn ? (
          <button
            onClick={handleSignOut}
            className="flex flex-col items-center gap-0.5 px-6 py-1 rounded-xl text-stone-400 hover:text-stone-700 transition-colors"
          >
            <LogOut size={22} strokeWidth={1.8} />
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
