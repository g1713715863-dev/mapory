import Navbar from '@/components/layout/Navbar'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="pt-0 md:pt-14 pb-16 md:pb-0 min-h-screen">{children}</main>
    </>
  )
}
