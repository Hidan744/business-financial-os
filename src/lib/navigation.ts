import type { ComponentType } from 'react'
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
  Package,
} from 'lucide-react'
import type { ModuleFlags, ModuleId } from '@/types/modules'

export interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  /** Если задан — пункт меню показывается только при modules[module] === true. */
  module?: ModuleId
}

export const NAV_ITEMS: NavItem[] = [
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
  { to: '/app/debts', label: 'Долги', icon: Landmark, module: 'debt' },
  { to: '/app/hr', label: 'Сотрудники', icon: Users, module: 'hr' },
  { to: '/app/inventory', label: 'Склад', icon: Package, module: 'inventory' },
  { to: '/app/goals', label: 'Цели', icon: Flag },
  { to: '/app/unit-economics', label: 'Unit-экономика', icon: Calculator, module: 'marketing' },
  { to: '/app/report', label: 'Отчёт', icon: FileText },
  { to: '/app/settings', label: 'Настройки', icon: Settings },
]

/** Пункты меню, релевантные текущей конфигурации бизнеса — пункты с module скрываются при modules[module] === false. */
export function getModuleVisibleNavItems(items: NavItem[], modules: ModuleFlags): NavItem[] {
  return items.filter((item) => !item.module || modules[item.module])
}
