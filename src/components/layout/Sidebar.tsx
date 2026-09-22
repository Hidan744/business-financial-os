import { Link, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileBarChart,
  Wallet,
  History,
  FileSpreadsheet,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Bot,
  AlertTriangle,
  Zap,
  Landmark,
  Scale,
  Users,
  Flag,
  Calculator,
  Percent,
  FileText,
  Settings,
  Home,
  Lock,
  LockOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/icons/BrandMark'
import { BusinessSwitcher } from './BusinessSwitcher'
import { useBusinessStore } from '@/store/businessStore'
import { useAccessGateStore } from '@/store/accessGateStore'

const NAV_ITEMS = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/finance', label: 'Финансы', icon: FileBarChart },
  { to: '/app/taxes', label: 'Налоги', icon: Percent },
  { to: '/app/balance', label: 'Баланс', icon: Scale },
  { to: '/app/cashflow', label: 'Cash Flow', icon: Wallet },
  { to: '/app/history', label: 'История', icon: History },
  { to: '/app/history-import', label: 'Импорт истории', icon: FileSpreadsheet },
  { to: '/app/simulator', label: 'Симулятор', icon: SlidersHorizontal },
  { to: '/app/sales', label: 'Продажи', icon: Target },
  { to: '/app/forecast', label: 'Прогноз', icon: TrendingUp },
  { to: '/app/plan', label: 'Финансовый план', icon: Target },
  { to: '/app/ai-cfo', label: 'AI CFO', icon: Bot },
  { to: '/app/crisis', label: 'Антикризис', icon: AlertTriangle },
  { to: '/app/stress-test', label: 'Стресс-тест', icon: Zap },
  { to: '/app/debts', label: 'Долги', icon: Landmark },
  { to: '/app/hr', label: 'Сотрудники', icon: Users },
  { to: '/app/goals', label: 'Цели', icon: Flag },
  { to: '/app/unit-economics', label: 'Unit-экономика', icon: Calculator },
  { to: '/app/report', label: 'Отчёт', icon: FileText },
  { to: '/app/settings', label: 'Настройки', icon: Settings },
]

export function Sidebar() {
  const protectedRoutes = useBusinessStore((s) => s.accessSettings.protectedRoutes)
  const unlockedBy = useAccessGateStore((s) => s.unlockedBy)
  const unlockedRoutes = useAccessGateStore((s) => s.unlockedRoutes)
  const lock = useAccessGateStore((s) => s.lock)

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
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const isLocked = protectedRoutes.includes(to) && !unlockedRoutes.includes(to)
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
        {unlockedBy && (
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
