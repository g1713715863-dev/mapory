'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Comment {
  id: string
  photo_id: string
  body: string
  created_at: string
  display_name: string | null
  email: string
}

export default function CommentsManager({ comments }: { comments: Comment[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function deleteComment(id: string) {
    setDeleting(id)
    await supabase.from('comments').delete().eq('id', id)
    setDeleting(null)
    router.refresh()
  }

  if (comments.length === 0) {
    return <p className="text-stone-500 text-sm">暂无评论</p>
  }

  return (
    <div className="space-y-3">
      {comments.map((c) => (
        <div key={c.id} className="flex gap-3 bg-white rounded-xl p-4 border border-stone-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-stone-700">
                {c.display_name || c.email.split('@')[0]}
              </span>
              <span className="text-xs text-stone-400">
                {new Date(c.created_at).toLocaleDateString('zh-CN', {
                  year: 'numeric', month: '2-digit', day: '2-digit',
                  hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">{c.body}</p>
          </div>
          <button
            onClick={() => deleteComment(c.id)}
            disabled={deleting === c.id}
            className="shrink-0 p-2 text-stone-400 hover:text-red-500 disabled:opacity-40 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}
