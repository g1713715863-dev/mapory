import { createClient } from '@/lib/supabase/server'
import TripManager from './TripManager'
import type { Trip } from '@/types'

export default async function AdminTripsPage() {
  const supabase = await createClient()
  const { data: trips } = await supabase
    .from('trips')
    .select('*, photos(count)')
    .order('start_date', { ascending: false })

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-stone-900 mb-6">管理行程</h1>
      <TripManager trips={(trips as any[]) ?? []} />
    </div>
  )
}
