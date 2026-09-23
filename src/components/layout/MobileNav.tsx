import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Home, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/icons/BrandMark'
import { BusinessSwitcher } from './BusinessSwitcher'
import { useBusinessStore } from '@/store/businessStore'
import { isRouteUnlockedForMember } from '@/types/teamAccess'
import { NAV_ITEMS, getModuleVisibleNavItems } from '@/lib/navigation'
import { getEffectiveModules } from '@/types/modules'

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const profile = useBusinessStore((s) => s.profile)
  const myRole = useBusinessStore((s) => s.myRole)
  const myAllowedDomains = useBusinessStore((s) => s.myAllowedDomains)

  const modules = getEffectiveModules(profile)
  const visibleItems = getModuleVisibleNavItems(NAV_ITEMS, modules).filter(
    ({ to }) => myRole !== 'member' || isRouteUnlockedForMember(to, myAllowedDomains),
  )

  return (
    <div className="lg:hidden print:hidden">
      <div className="flex items-center justify-between h-14 px-4 border-b border-ink-800 bg-ink-950">
        <Link to="/" className="flex items-center gap-2">
          <BrandMark className="size-4 text-brand-400" />
          <span className="text-sm font-semibold">Business Financial OS</span>
        </Link>
        <button onClick={() => setOpen(true)} aria-label="Открыть меню" className="text-ink-300">
          <Menu className="size-5" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950 flex flex-col">
          <div className="flex items-center justify-between h-14 px-4 border-b border-ink-800 shrink-0">
            <span className="text-sm font-semibold">Меню</span>
            <button onClick={() => setOpen(false)} aria-label="Закрыть меню" className="text-ink-300">
              <X className="size-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="px-3 pt-3">
              <BusinessSwitcher />
            </div>
            <nav className="p-3 space-y-1">
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-xl px-4 py-3 text-sm font-medium',
                      isActive ? 'bg-brand-500/15 text-brand-400' : 'text-ink-300',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="px-3 pt-3 pb-3 border-t border-ink-800">
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink-300"
              >
                <Home className="size-4 shrink-0" />
                На главную
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
