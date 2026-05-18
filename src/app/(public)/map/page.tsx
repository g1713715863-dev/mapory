import { createClient } from '@/lib/supabase/server'
import MapView from '@/components/map/MapView'
import type { Photo, Trip } from '@/types'

export default async function MapPage() {
  const supabase = await createClient()

  const [{ data: photos }, { data: trips }] = await Promise.all([
    supabase
      .from('photos')
      .select('*')
      .not('lat', 'is', null)
      .order('taken_at', { ascending: false }),
    supabase.from('trips').select('*').order('start_date', { ascending: false }),
  ])

  return (
    <div className="fixed inset-0 md:top-14 md:bottom-0">
      <MapView photos={(photos as Photo[]) ?? []} trips={(trips as Trip[]) ?? []} />
    </div>
  )
}
