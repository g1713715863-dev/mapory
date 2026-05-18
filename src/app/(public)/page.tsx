import Link from 'next/link'
import { Map, Images, ArrowRight } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 -mt-16">
      {/* Hero */}
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 mb-6">
          <Map size={32} className="text-primary-600" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-stone-900 mb-3">
          Mapory
        </h1>
        <p className="text-stone-500 text-lg leading-relaxed mb-8">
          把旅行照片钉在地图上<br />
          记录每一段旅途的故事
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/map"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
          >
            <Map size={18} />
            查看地图
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/album"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-stone-100 text-stone-700 font-medium hover:bg-stone-200 transition-colors"
          >
            <Images size={18} />
            浏览相册
          </Link>
        </div>
      </div>

      {/* 特性卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 max-w-2xl w-full">
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
    </div>
  )
}
