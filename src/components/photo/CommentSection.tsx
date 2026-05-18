'use client'

import { useState, useEffect } from 'react'
import { Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Comment {
  id: string
  body: string
  created_at: string
  display_name: string | null
  email: string
}

export default function CommentSection({ photoId }: { photoId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) =>
      setUser(data.user?.email ? { email: data.user.email } : null)
    )
    fetchComments()
  }, [photoId])

  async function fetchComments() {
    const { data } = await supabase
      .from('comments_with_user')
      .select('*')
      .eq('photo_id', photoId)
      .order('created_at', { ascending: true })
    setComments((data as Comment[]) ?? [])
  }

  async function submit() {
    if (!text.trim() || !user) return
    setLoading(true)
    const { data: { user: me } } = await supabase.auth.getUser()
    if (!me) { setLoading(false); return }
    await supabase.from('comments').insert({ photo_id: photoId, user_id: me.id, body: text.trim() })
    setText('')
    await fetchComments()
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full p-4">
      <h4 className="text-white font-medium text-sm mb-3">评论</h4>

      {/* 评论列表 */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {comments.length === 0 && (
          <p className="text-stone-500 text-xs text-center py-6">还没有评论，来说第一句吧</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="group">
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

      {/* 输入框 */}
      {user ? (
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
