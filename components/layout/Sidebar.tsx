'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, KanbanSquare, Users, Wrench, Settings, Calendar, LogOut, Mail, Star, Zap, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Job Board', href: '/board', icon: KanbanSquare },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Communications', href: '/communications', icon: Mail },
  { name: 'Reviews', href: '/reviews', icon: Star },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Services', href: '/services', icon: Wrench },
  { name: 'Automation', href: '/automation', icon: Zap },
  { name: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleLinkClick = () => {
    // Close mobile menu when navigating
    if (onMobileClose) {
      onMobileClose()
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex h-full w-52 flex-col border-r transition-transform duration-300 ease-in-out lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: '#32373c' }}
      >
      {/* Logo/Brand with close button on mobile */}
      <div className="flex h-16 items-center justify-between border-b border-gray-700 px-4">
        <Image
          src="/logo.png"
          alt="Detail Dynamics"
          width={180}
          height={29}
          className="h-7 w-auto"
        />
        {/* Close button - only visible on mobile */}
        <button
          onClick={onMobileClose}
          className="lg:hidden text-gray-300 hover:text-white p-1"
          aria-label="Close menu"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              )}
              style={isActive ? { backgroundColor: '#d52329' } : {}}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Powered by Cold Lava */}
      <div className="px-3 py-2">
        <a
          href="https://coldlavaai.github.io/home"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
        >
          <span>Powered by</span>
          <Image
            src="https://cdn.shopify.com/s/files/1/0951/6141/8067/files/Full_logo_White_text_no_logo_glow.png?v=1761221158"
            alt="Cold Lava"
            width={120}
            height={30}
            className="h-6 w-auto"
          />
        </a>
      </div>

      {/* Logout */}
      <div className="border-t border-gray-700 p-3">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start gap-3 text-gray-300 hover:text-white hover:bg-gray-700"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
    </>
  )
}
