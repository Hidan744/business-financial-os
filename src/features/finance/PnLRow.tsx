import type { ReactNode } from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import { Input } from '@/components/ui/input'

interface PnLRowProps {
  label: string
  value: number
  kind?: 'line' | 'subtotal' | 'total'
  sign?: '+' | '-' | '='
  editable?: boolean
  onChange?: (value: number) => void
  extra?: ReactNode
}

export function PnLRow({ label, value, kind = 'line', sign, editable, onChange, extra }: PnLRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-2.5 px-1',
        kind === 'subtotal' && 'border-t border-ink-800 mt-1 pt-3 font-medium text-ink-100',
        kind === 'total' && 'border-t border-ink-700 mt-1 pt-3 font-semibold text-ink-50 text-base',
      )}
    >
      <div className="flex items-center gap-2 text-sm text-ink-400">
        {sign && <span className="text-ink-600 w-3">{sign}</span>}
        <span className={cn(kind !== 'line' && 'text-ink-200')}>{label}</span>
        {extra}
      </div>
      {editable && onChange ? (
        <Input
          inputMode="decimal"
          defaultValue={value === 0 ? '' : String(value)}
          onBlur={(e) => {
            const parsed = Number(e.target.value.replace(/\s/g, '').replace(',', '.'))
            onChange(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0)
          }}
          className="w-36 text-right"
        />
      ) : (
        <span
          className={cn(
            'text-sm tabular-nums',
            value < 0 ? 'text-negative-500' : kind === 'total' ? 'text-ink-50' : 'text-ink-200',
          )}
        >
          {formatCurrency(value)}
        </span>
      )}
    </div>
  )
}
