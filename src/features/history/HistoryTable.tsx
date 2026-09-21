import { Trash2 } from 'lucide-react'
import { buildFinancialSnapshot } from '@/lib/finance/snapshot'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { formatPeriodLabel } from '@/lib/period'
import type { FinancialInputs } from '@/types/finance'

interface Row {
  inputs: FinancialInputs
  isCurrent: boolean
}

export function HistoryTable({
  current,
  history,
  onRemove,
}: {
  current: FinancialInputs
  history: FinancialInputs[]
  onRemove: (period: string) => void
}) {
  const rows: Row[] = [
    { inputs: current, isCurrent: true },
    ...history.map((h) => ({ inputs: h, isCurrent: false })),
  ].sort((a, b) => b.inputs.period.localeCompare(a.inputs.period))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink-500 border-b border-ink-800">
            <th className="py-2 pr-4 font-medium">Период</th>
            <th className="py-2 pr-4 font-medium text-right">Выручка</th>
            <th className="py-2 pr-4 font-medium text-right">Чистая прибыль</th>
            <th className="py-2 pr-4 font-medium text-right">EBITDA маржа</th>
            <th className="py-2 pr-2 font-medium w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ inputs, isCurrent }) => {
            const snapshot = buildFinancialSnapshot(inputs)
            return (
              <tr key={inputs.period} className="border-b border-ink-800/60">
                <td className="py-2.5 pr-4 text-ink-200 capitalize">
                  {formatPeriodLabel(inputs.period)}
                  {isCurrent && <span className="ml-2 text-xs text-brand-400">текущий</span>}
                </td>
                <td className="py-2.5 pr-4 text-right text-ink-100 tabular-nums">{formatCurrency(snapshot.revenue)}</td>
                <td
                  className={`py-2.5 pr-4 text-right tabular-nums ${snapshot.netProfit >= 0 ? 'text-positive-500' : 'text-negative-500'}`}
                >
                  {formatCurrency(snapshot.netProfit)}
                </td>
                <td className="py-2.5 pr-4 text-right text-ink-300 tabular-nums">{formatPercent(snapshot.ebitdaMarginPct)}</td>
                <td className="py-2.5 pr-2 text-right">
                  {!isCurrent && (
                    <button
                      onClick={() => onRemove(inputs.period)}
                      className="text-ink-500 hover:text-negative-500 transition-colors"
                      aria-label={`Удалить запись за ${inputs.period}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
