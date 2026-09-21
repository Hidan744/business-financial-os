import { useState } from 'react'
import { Target, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import { formatPeriodLabel } from '@/lib/period'
import { buildFinancialSnapshot } from '@/lib/finance/snapshot'
import type { FinancialInputs, PeriodTarget } from '@/types/finance'

function toNumber(v: string): number {
  const n = Number(v.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function VarianceRow({ label, actual, target, format }: { label: string; actual: number; target: number; format: (v: number) => string }) {
  const varPct = target > 0 ? ((actual - target) / target) * 100 : null
  const onTrack = varPct !== null && varPct >= 0
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-ink-400">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-ink-500 tabular-nums">План: {format(target)}</span>
        <span className="text-ink-100 font-medium tabular-nums">Факт: {format(actual)}</span>
        {varPct !== null && (
          <span className={cn('text-xs tabular-nums font-medium', onTrack ? 'text-positive-500' : 'text-negative-500')}>
            {varPct >= 0 ? '+' : ''}{varPct.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}

export function TargetSection({
  current,
  targets,
  onSetTarget,
  onRemoveTarget,
}: {
  current: FinancialInputs
  targets: PeriodTarget[]
  onSetTarget: (target: PeriodTarget) => void
  onRemoveTarget: (period: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [revenue, setRevenue] = useState('')
  const [profit, setProfit] = useState('')
  const [sales, setSales] = useState('')

  const currentTarget = targets.find((t) => t.period === current.period)
  const snapshot = buildFinancialSnapshot(current)

  function handleSave() {
    onSetTarget({
      period: current.period,
      targetRevenue: toNumber(revenue),
      targetNetProfit: toNumber(profit),
      targetSalesCount: toNumber(sales),
    })
    setOpen(false)
  }

  return (
    <div className="space-y-4">
      {currentTarget ? (
        <div className="rounded-xl border border-ink-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-ink-500 capitalize">{formatPeriodLabel(currentTarget.period)}</span>
            <button
              onClick={() => onRemoveTarget(currentTarget.period)}
              className="text-ink-500 hover:text-negative-500 transition-colors"
              aria-label="Удалить цель"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <VarianceRow label="Выручка" actual={snapshot.revenue} target={currentTarget.targetRevenue} format={formatCurrency} />
          <VarianceRow label="Чистая прибыль" actual={snapshot.netProfit} target={currentTarget.targetNetProfit} format={formatCurrency} />
          <VarianceRow label="Продажи" actual={current.salesCount} target={currentTarget.targetSalesCount} format={formatNumber} />
        </div>
      ) : !open ? (
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <Target className="size-4" /> Задать цель на текущий период
        </Button>
      ) : null}

      {open && (
        <div className="rounded-xl border border-ink-800 p-4 space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="target-revenue">Целевая выручка</Label>
              <Input id="target-revenue" inputMode="decimal" value={revenue} onChange={(e) => setRevenue(e.target.value)} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="target-profit">Целевая прибыль</Label>
              <Input id="target-profit" inputMode="decimal" value={profit} onChange={(e) => setProfit(e.target.value)} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="target-sales">Целевые продажи</Label>
              <Input id="target-sales" inputMode="decimal" value={sales} onChange={(e) => setSales(e.target.value)} className="mt-2" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>Сохранить</Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Отмена</Button>
          </div>
        </div>
      )}
    </div>
  )
}
