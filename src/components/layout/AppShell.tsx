import type { ReactNode } from 'react'
import { useRouter } from 'next/router'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const isIndex = router.pathname === '/'

  return (
    <div className={`min-h-screen bg-canvas ${isIndex ? 'index-page' : ''}`}>
      {isIndex ? null : <Navbar />}
      <main>{children}</main>
      {isIndex ? null : <Footer />}
    </div>
  )
}
