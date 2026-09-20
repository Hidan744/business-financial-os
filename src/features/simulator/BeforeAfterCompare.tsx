import { ArrowRight } from 'lucide-react'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'

interface CompareRow {
  label: string
  before: number
  after: number
  format: 'currency' | 'percent'
}

export function BeforeAfterCompare({ rows }: { rows: CompareRow[] }) {
  const fmt = (v: number, f: CompareRow['format']) => (f === 'currency' ? formatCurrency(v) : formatPercent(v))

  return (
    <div className="divide-y divide-ink-800/60">
      {rows.map((row) => {
        const delta = row.after - row.before
        const improved = delta > 0
        return (
          <div key={row.label} className="flex items-center justify-between py-3">
            <span className="text-sm text-ink-400">{row.label}</span>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-ink-500 tabular-nums">{fmt(row.before, row.format)}</span>
              <ArrowRight className="size-3.5 text-ink-600" />
              <span className="font-semibold text-ink-50 tabular-nums">{fmt(row.after, row.format)}</span>
              {delta !== 0 && (
                <span className={cn('text-xs tabular-nums', improved ? 'text-positive-500' : 'text-negative-500')}>
                  ({improved ? '+' : ''}
                  {fmt(delta, row.format)})
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
