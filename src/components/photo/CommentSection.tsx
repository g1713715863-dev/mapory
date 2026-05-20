'use client'

import { useState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Comment {
  id: string
  user_id: string
  body: string
  created_at: string
  display_name: string | null
  email: string
}

interface CurrentUser {
  id: string
  email: string
  isAdmin: boolean
}

export default function CommentSection({ photoId }: { photoId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  // Keep a ref so fetchComments closure always has latest user info
  const userRef = useRef<CurrentUser | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      let cu: CurrentUser | null = null
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()
        cu = {
          id: user.id,
          email: user.email ?? '',
          isAdmin: (profile as { is_admin?: boolean } | null)?.is_admin ?? false,
        }
        setCurrentUser(cu)
        userRef.current = cu
      }
      await fetchComments(cu)
      setInitialized(true)
    }
    init()
  }, [photoId])

  async function fetchComments(cu: CurrentUser | null = userRef.current) {
    // Not logged in: show nothing
    if (!cu) { setComments([]); return }

    const { data } = await supabase
      .from('comments_with_user')
      .select('*')
      .eq('photo_id', photoId)
      .order('created_at', { ascending: true })

    const all = (data as Comment[]) ?? []
    // Admin sees everything; regular users only see their own comments
    setComments(cu.isAdmin ? all : all.filter((c) => c.user_id === cu.id))
  }

  async function submit() {
    if (!text.trim() || !currentUser) return
    setLoading(true)
    await supabase.from('comments').insert({
      photo_id: photoId,
      user_id: currentUser.id,
      body: text.trim(),
    })
    setText('')
    await fetchComments()
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full p-4">
      <h4 className="text-white font-medium text-sm mb-3">评论</h4>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {initialized && comments.length === 0 && (
          <p className="text-stone-500 text-xs text-center py-6">
            {currentUser ? '还没有评论，来说第一句吧' : '还没有评论'}
          </p>
        )}
        {comments.map((c) => (
          <div key={c.id}>
            <div className="flex items-baseline gap-2">
              <span className="text-stone-300 text-xs font-medium">
                {c.display_name || c.email.split('@')[0]}
              </span>
              <span className="text-stone-600 text-[10px]">
                {new Date(c.created_at).toLocaleDateString('zh-CN')}
              </span>
            </div>
            <p className="text-stone-300 text-sm mt-0.5 leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>

      {currentUser ? (
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submit()}
            placeholder="写下你的感受…"
            maxLength={500}
            className="flex-1 bg-stone-800 text-stone-200 placeholder:text-stone-600 text-sm px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            onClick={submit}
            disabled={loading || !text.trim()}
            className="p-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-40 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      ) : (
        <p className="text-stone-500 text-xs text-center">
          <a href="/auth/login" className="text-primary-400 hover:underline">登录</a> 后可以留言
        </p>
      )}
    </div>
  )
}
