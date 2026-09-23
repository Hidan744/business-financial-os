import { Link, NavLink } from 'react-router-dom'
import { Home, Lock, LockOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/icons/BrandMark'
import { BusinessSwitcher } from './BusinessSwitcher'
import { useBusinessStore } from '@/store/businessStore'
import { useAccessGateStore } from '@/store/accessGateStore'
import { isRouteUnlockedForMember } from '@/types/teamAccess'
import { NAV_ITEMS, getModuleVisibleNavItems } from '@/lib/navigation'
import { getEffectiveModules } from '@/types/modules'

export function Sidebar() {
  const profile = useBusinessStore((s) => s.profile)
  const protectedRoutes = useBusinessStore((s) => s.accessSettings.protectedRoutes)
  const myRole = useBusinessStore((s) => s.myRole)
  const myAllowedDomains = useBusinessStore((s) => s.myAllowedDomains)
  const unlockedBy = useAccessGateStore((s) => s.unlockedBy)
  const unlockedRoutes = useAccessGateStore((s) => s.unlockedRoutes)
  const lock = useAccessGateStore((s) => s.lock)

  const modules = getEffectiveModules(profile)
  // Участник команды видит в меню только разделы, которые ему реально открыты —
  // сервер и так не отдаст туда данные, поэтому нет смысла показывать пункт, который
  // при клике покажет "нет доступа". Настройки (управление доступом) — только владельцу.
  // Плюс: разделы неактивных модулей (склад/сотрудники/долги/unit-экономика) скрыты для всех.
  const visibleItems = getModuleVisibleNavItems(NAV_ITEMS, modules).filter(
    ({ to }) => myRole !== 'member' || isRouteUnlockedForMember(to, myAllowedDomains),
  )

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-ink-800 bg-ink-950 h-screen sticky top-0 print:hidden">
      <Link to="/" className="flex items-center gap-2 px-5 h-16 border-b border-ink-800 hover:bg-ink-900 transition-colors">
        <div className="flex size-8 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400 shrink-0">
          <BrandMark className="size-4" />
        </div>
        <div className="text-sm font-semibold text-ink-50 truncate">Business Financial OS</div>
      </Link>

      <div className="px-3 pt-3">
        <BusinessSwitcher />
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-1">
        {visibleItems.map(({ to, label, icon: Icon }) => {
          const isLocked = myRole === null && protectedRoutes.includes(to) && !unlockedRoutes.includes(to)
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-500/15 text-brand-400'
                    : 'text-ink-400 hover:text-ink-100 hover:bg-ink-900',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {isLocked && <Lock className="size-3 shrink-0 text-ink-600" />}
            </NavLink>
          )
        })}
      </nav>

      <div className="px-3 py-3 border-t border-ink-800 space-y-1">
        {myRole === null && unlockedBy && (
          <button
            onClick={() => lock()}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-warning-500 hover:bg-ink-900 transition-colors"
          >
            <LockOpen className="size-4 shrink-0" />
            Заблокировать доступ
          </button>
        )}
        <Link
          to="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-400 hover:text-ink-100 hover:bg-ink-900 transition-colors"
        >
          <Home className="size-4 shrink-0" />
          На главную
        </Link>
      </div>
    </aside>
  )
}
