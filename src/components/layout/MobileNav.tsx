import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BusinessSwitcher } from './BusinessSwitcher'

const NAV_ITEMS = [
  { to: '/app/dashboard', label: 'Dashboard' },
  { to: '/app/finance', label: 'Финансы' },
  { to: '/app/balance', label: 'Баланс' },
  { to: '/app/cashflow', label: 'Cash Flow' },
  { to: '/app/history', label: 'История' },
  { to: '/app/simulator', label: 'Симулятор' },
  { to: '/app/sales', label: 'Продажи' },
  { to: '/app/forecast', label: 'Прогноз' },
  { to: '/app/ai-cfo', label: 'AI CFO' },
  { to: '/app/crisis', label: 'Антикризис' },
  { to: '/app/stress-test', label: 'Стресс-тест' },
  { to: '/app/debts', label: 'Долги' },
  { to: '/app/hr', label: 'Сотрудники' },
  { to: '/app/goals', label: 'Цели' },
  { to: '/app/unit-economics', label: 'Unit-экономика' },
  { to: '/app/report', label: 'Отчёт' },
  { to: '/app/settings', label: 'Настройки' },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <div className="lg:hidden print:hidden">
      <div className="flex items-center justify-between h-14 px-4 border-b border-ink-800 bg-ink-950">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-brand-400" />
          <span className="text-sm font-semibold">Business Financial OS</span>
        </div>
        <button onClick={() => setOpen(true)} aria-label="Открыть меню" className="text-ink-300">
          <Menu className="size-5" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950">
          <div className="flex items-center justify-between h-14 px-4 border-b border-ink-800">
            <span className="text-sm font-semibold">Меню</span>
            <button onClick={() => setOpen(false)} aria-label="Закрыть меню" className="text-ink-300">
              <X className="size-5" />
            </button>
          </div>
          <div className="px-3 pt-3">
            <BusinessSwitcher />
          </div>
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => (
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
        </div>
      )}
    </div>
  )
}
