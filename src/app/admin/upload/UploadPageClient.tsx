'use client'

import { useRouter } from 'next/navigation'
import UploadForm from '@/components/photo/UploadForm'
import type { Trip } from '@/types'

export default function UploadPageClient({ trips }: { trips: Trip[] }) {
  const router = useRouter()
  return <UploadForm trips={trips} onSuccess={() => router.push('/album')} />
}
