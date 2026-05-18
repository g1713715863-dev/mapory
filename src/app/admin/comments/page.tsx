import { createClient } from '@/lib/supabase/server'
import CommentsManager from './CommentsManager'

export default async function AdminCommentsPage() {
  const supabase = await createClient()
  const { data: comments } = await supabase
    .from('comments_with_user')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-stone-900 mb-6">评论管理</h1>
      <CommentsManager comments={(comments as any[]) ?? []} />
    </div>
  )
}
