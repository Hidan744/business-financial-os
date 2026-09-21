import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileBarChart,
  Wallet,
  History,
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
  FileText,
  Settings,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BusinessSwitcher } from './BusinessSwitcher'

const NAV_ITEMS = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/finance', label: 'Финансы', icon: FileBarChart },
  { to: '/app/balance', label: 'Баланс', icon: Scale },
  { to: '/app/cashflow', label: 'Cash Flow', icon: Wallet },
  { to: '/app/history', label: 'История', icon: History },
  { to: '/app/simulator', label: 'Симулятор', icon: SlidersHorizontal },
  { to: '/app/sales', label: 'Продажи', icon: Target },
  { to: '/app/forecast', label: 'Прогноз', icon: TrendingUp },
  { to: '/app/ai-cfo', label: 'AI CFO', icon: Bot },
  { to: '/app/crisis', label: 'Антикризис', icon: AlertTriangle },
  { to: '/app/stress-test', label: 'Стресс-тест', icon: Zap },
  { to: '/app/debts', label: 'Долги', icon: Landmark },
  { to: '/app/hr', label: 'Сотрудники', icon: Users },
  { to: '/app/goals', label: 'Цели', icon: Flag },
  { to: '/app/report', label: 'Отчёт', icon: FileText },
  { to: '/app/settings', label: 'Настройки', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-ink-800 bg-ink-950 h-screen sticky top-0 print:hidden">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-ink-800">
        <div className="flex size-8 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400 shrink-0">
          <Sparkles className="size-4" />
        </div>
        <div className="text-sm font-semibold text-ink-50 truncate">Business Financial OS</div>
      </div>

      <div className="px-3 pt-3">
        <BusinessSwitcher />
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
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
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
