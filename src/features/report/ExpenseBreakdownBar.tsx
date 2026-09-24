import { CATEGORICAL } from '@/lib/chartColors'
import { formatCurrency, formatPercent } from '@/lib/utils'
import type { ExpenseBreakdownItem } from '@/lib/finance/reportCharts'

const SLOT_COLORS = [
  CATEGORICAL.slot1,
  CATEGORICAL.slot2,
  CATEGORICAL.slot3,
  CATEGORICAL.slot4,
  CATEGORICAL.slot5,
  CATEGORICAL.slot6,
  CATEGORICAL.slot7,
  CATEGORICAL.slot8,
]

/**
 * Часть-от-целого одной статичной суммой лучше читается как единая 100%-полоса с сегментами
 * (dataviz: "part-to-whole -> stacked bar"), чем как pie/donut — легче сравнивать размеры долей.
 */
export function ExpenseBreakdownBar({ items }: { items: ExpenseBreakdownItem[] }) {
  const total = items.reduce((s, i) => s + i.value, 0)

  if (total <= 0) {
    return <p className="text-sm text-ink-500">Нет расходов за период — нечего показывать.</p>
  }

  return (
    <div>
      <div className="flex w-full h-8 gap-0.5">
        {items.map((item, i) => {
          const pct = (item.value / total) * 100
          return (
            <div
              key={item.label}
              title={`${item.label}: ${formatCurrency(item.value)} (${formatPercent(pct)})`}
              style={{ width: `${pct}%`, background: SLOT_COLORS[i % SLOT_COLORS.length] }}
              className="h-full first:rounded-l last:rounded-r min-w-[2px]"
            />
          )
        })}
      </div>
      <div className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-2">
        {items.map((item, i) => {
          const pct = (item.value / total) * 100
          return (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              <span className="size-2.5 rounded-full shrink-0" style={{ background: SLOT_COLORS[i % SLOT_COLORS.length] }} />
              <span className="text-ink-300 flex-1 truncate">{item.label}</span>
              <span className="text-ink-500 tabular-nums shrink-0">{formatPercent(pct)}</span>
              <span className="text-ink-50 font-medium tabular-nums shrink-0 w-24 text-right">{formatCurrency(item.value)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
