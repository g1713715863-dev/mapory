'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ArrowDownUp } from 'lucide-react'

export default function SortToggle({ order }: { order: 'asc' | 'desc' }) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <button
      onClick={() => router.push(`${pathname}?order=${order === 'desc' ? 'asc' : 'desc'}`)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
    >
      <ArrowDownUp size={13} />
      {order === 'desc' ? '从新到旧' : '从旧到新'}
    </button>
  )
}
