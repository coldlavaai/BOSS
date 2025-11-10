'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Don't show sidebar on login page
  const showSidebar = pathname !== '/login' && pathname !== '/'

  if (!showSidebar) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar - hidden on mobile */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header - hidden on desktop */}
        <div className="lg:hidden flex items-center justify-between h-14 px-4 border-b bg-white sticky top-0 z-30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(true)}
            className="text-gray-700"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <span className="font-semibold text-gray-900">Detail Dynamics</span>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>

        {/* Main content with bottom padding on mobile for bottom nav */}
        <main className="flex-1 overflow-y-auto bg-white pb-16 lg:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Navigation - hidden on desktop */}
        <BottomNav />
      </div>
    </div>
  )
}
