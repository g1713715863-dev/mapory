import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mapory — 我的旅行地图',
  description: '把旅行照片钉在地图上，记录每一段旅途的故事',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${geist.variable} h-full`}>
      <body className="h-full bg-stone-50 text-stone-900 antialiased">
        {children}
      </body>
    </html>
  )
}
