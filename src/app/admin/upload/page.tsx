import { createClient } from '@/lib/supabase/server'
import UploadPageClient from './UploadPageClient'
import type { Trip } from '@/types'

export default async function AdminUploadPage() {
  const supabase = await createClient()
  const { data: trips } = await supabase
    .from('trips')
    .select('*')
    .order('start_date', { ascending: false })

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-stone-900 mb-6">上传照片</h1>
      {(trips?.length ?? 0) === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 text-sm">
          请先在「管理行程」中创建一个行程，再上传照片。
        </div>
      ) : (
        <UploadPageClient trips={trips as Trip[]} />
      )}
    </div>
  )
}
