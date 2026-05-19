import { createClient } from '@/lib/supabase/server'
import { Map } from 'lucide-react'
import HeroMap from '@/components/layout/HeroMap'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: photos } = await supabase
    .from('photos')
    .select('lat, lng')
    .not('lat', 'is', null)

  const photoCoords = (photos ?? []) as { lat: number; lng: number }[]

  return (
    <div className="flex flex-col">
      {/* Hero：地图背景 */}
      <section className="relative h-[65vh] min-h-[400px] overflow-hidden">
        <div className="absolute inset-0">
          <HeroMap photos={photoCoords} />
        </div>
        <div className="absolute inset-0 bg-white/55" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 mb-5 shadow-sm">
            <Map size={28} className="text-primary-600" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-stone-900 mb-3">
            Mapory
          </h1>
          <p className="text-stone-600 text-lg leading-relaxed">
            把旅行照片钉在地图上<br />
            记录每一段旅途的故事
          </p>
        </div>
      </section>

      {/* 特性卡片 */}
      <section className="max-w-2xl mx-auto w-full px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '📍', title: '自动定位', desc: '照片 GPS 信息自动读取，手动也可精准调整' },
            { icon: '🗺️', title: '地图模式', desc: '把所有旅行足迹标注在世界地图上' },
            { icon: '🖼️', title: '相册模式', desc: '按行程分组，方便与家人朋友分享' },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="font-semibold text-stone-800 mb-1">{item.title}</div>
              <div className="text-sm text-stone-500 leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
