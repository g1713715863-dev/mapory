import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Map, Images, Upload, Settings, LogOut } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) redirect('/')

  return (
    <div className="flex min-h-screen bg-stone-50">
      {/* 侧边栏 */}
      <aside className="w-56 shrink-0 bg-white border-r border-stone-100 flex flex-col">
        <div className="p-5 border-b border-stone-100">
          <Link href="/" className="text-lg font-semibold text-stone-900">Mapory</Link>
          <p className="text-xs text-stone-400 mt-0.5">管理后台</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {[
            { href: '/admin/upload', label: '上传照片', icon: Upload },
            { href: '/admin/trips', label: '管理行程', icon: Map },
            { href: '/admin/comments', label: '评论管理', icon: Settings },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-stone-100">
          <p className="text-xs text-stone-400 truncate px-3 mb-1">{user.email}</p>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm text-stone-500 hover:bg-stone-100 transition-colors"
            >
              <LogOut size={14} />
              退出登录
            </button>
          </form>
        </div>
      </aside>

      {/* 内容区 */}
      <main className="flex-1 p-8 min-w-0">{children}</main>
    </div>
  )
}
