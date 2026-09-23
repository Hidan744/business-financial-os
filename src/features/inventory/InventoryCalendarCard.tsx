import { useState } from 'react'
import { CalendarDays, SplitSquareHorizontal } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InfoTooltip } from '@/components/ui/tooltip'
import { calculateStockOnHandAsOf, calculateStockValue, summarizeMovementsInRange } from '@/lib/finance/inventory'
import type { Product, StockMovement } from '@/types/inventory'
import { formatCurrency, cn } from '@/lib/utils'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function stockValueAsOf(products: Product[], movements: StockMovement[], asOfDate: string): number {
  return products.reduce((sum, p) => sum + calculateStockValue(calculateStockOnHandAsOf(p.id, movements, asOfDate), p.costPerUnit), 0)
}

type Mode = 'day' | 'compare'

export function InventoryCalendarCard({ products, stockMovements }: { products: Product[]; stockMovements: StockMovement[] }) {
  const [mode, setMode] = useState<Mode>('day')

  const [day, setDay] = useState(today())

  const [aFrom, setAFrom] = useState(addDays(today(), -6))
  const [aTo, setATo] = useState(today())
  const [bFrom, setBFrom] = useState(addDays(today(), -13))
  const [bTo, setBTo] = useState(addDays(today(), -7))

  if (products.length === 0) return null

  const daySummary = summarizeMovementsInRange(stockMovements, products, day, day)
  const dayValue = stockValueAsOf(products, stockMovements, day)
  const dayPrevValue = stockValueAsOf(products, stockMovements, addDays(day, -1))

  const periodA = summarizeMovementsInRange(stockMovements, products, aFrom, aTo)
  const periodB = summarizeMovementsInRange(stockMovements, products, bFrom, bTo)
  const rangeInvalid = aFrom > aTo || bFrom > bTo

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-1.5">
          Календарь склада
          <InfoTooltip>
            Остаток и движения на любую дату в прошлом считаются по тому же журналу движений, что и
            на странице выше — просто с учётом даты. Ничего не хранится отдельно.
          </InfoTooltip>
        </CardTitle>
        <div className="flex gap-1 rounded-lg bg-ink-950/50 p-1">
          <ModeButton active={mode === 'day'} onClick={() => setMode('day')} icon={<CalendarDays className="size-3.5" />} label="За день" />
          <ModeButton active={mode === 'compare'} onClick={() => setMode('compare')} icon={<SplitSquareHorizontal className="size-3.5" />} label="Сравнить периоды" />
        </div>
      </CardHeader>
      <CardContent className="pt-2 space-y-4">
        {mode === 'day' ? (
          <>
            <div className="max-w-[200px]">
              <Label className="text-xs">Дата</Label>
              <Input type="date" className="mt-1" value={day} onChange={(e) => setDay(e.target.value)} max={today()} />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <MiniStat label="Стоимость склада на конец дня" value={formatCurrency(dayValue)} sub={formatDelta(dayValue - dayPrevValue)} accentFromDelta={dayValue - dayPrevValue} />
              <MiniStat label="Приходы" value={`${daySummary.receiptsCount}`} sub={daySummary.receiptsQty > 0 ? `${daySummary.receiptsQty} шт · ${formatCurrency(daySummary.receiptsValue)}` : '—'} />
              <MiniStat label="Продажи" value={`${daySummary.salesCount}`} sub={daySummary.salesQty > 0 ? `${daySummary.salesQty} шт · ${formatCurrency(daySummary.salesValue)}` : '—'} />
              <MiniStat label="Списания" value={`${daySummary.writeoffsCount}`} sub={daySummary.writeoffsQty > 0 ? `${daySummary.writeoffsQty} шт · ${formatCurrency(daySummary.writeoffsValue)}` : '—'} />
            </div>
          </>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <PeriodPicker label="Период A" from={aFrom} to={aTo} onFrom={setAFrom} onTo={setATo} />
              <PeriodPicker label="Период B" from={bFrom} to={bTo} onFrom={setBFrom} onTo={setBTo} />
            </div>
            {rangeInvalid ? (
              <p className="text-sm text-negative-500">Дата «с» не может быть позже даты «по».</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-500 border-b border-ink-800">
                      <th className="py-2 pr-4 font-medium"> </th>
                      <th className="py-2 pr-4 font-medium">Период A</th>
                      <th className="py-2 pr-4 font-medium">Период B</th>
                      <th className="py-2 pr-2 font-medium">Разница</th>
                    </tr>
                  </thead>
                  <tbody>
                    <CompareRow label="Приход, шт" a={periodA.receiptsQty} b={periodB.receiptsQty} />
                    <CompareRow label="Продажи, шт" a={periodA.salesQty} b={periodB.salesQty} />
                    <CompareRow label="Списания, шт" a={periodA.writeoffsQty} b={periodB.writeoffsQty} />
                    <CompareRow label="Выручка от продаж" a={periodA.salesValue} b={periodB.salesValue} currency />
                    <CompareRow label="Изменение стоимости склада" a={periodA.netValueChange} b={periodB.netValueChange} currency signed />
                    <CompareRow label="Движений всего" a={periodA.movementsCount} b={periodB.movementsCount} />
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function formatDelta(delta: number): string {
  if (delta === 0) return 'без изменений за день'
  return `${delta > 0 ? '+' : ''}${formatCurrency(delta)} за день`
}

function ModeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
        active ? 'bg-ink-800 text-ink-50' : 'text-ink-500 hover:text-ink-200',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function PeriodPicker({ label, from, to, onFrom, onTo }: { label: string; from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  return (
    <div>
      <div className="text-xs font-medium text-ink-300 mb-1.5">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px]">С</Label>
          <Input type="date" className="mt-1" value={from} onChange={(e) => onFrom(e.target.value)} max={today()} />
        </div>
        <div>
          <Label className="text-[11px]">По</Label>
          <Input type="date" className="mt-1" value={to} onChange={(e) => onTo(e.target.value)} max={today()} />
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value, sub, accentFromDelta }: { label: string; value: string; sub: string; accentFromDelta?: number }) {
  const accentClass =
    accentFromDelta === undefined ? 'text-ink-500' : accentFromDelta > 0 ? 'text-positive-500' : accentFromDelta < 0 ? 'text-negative-500' : 'text-ink-500'
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-950/40 px-3.5 py-3">
      <div className="text-xs text-ink-500">{label}</div>
      <div className="text-lg font-semibold text-ink-50 mt-1 tabular-nums">{value}</div>
      <div className={cn('text-xs mt-0.5 tabular-nums', accentClass)}>{sub}</div>
    </div>
  )
}

function CompareRow({ label, a, b, currency, signed }: { label: string; a: number; b: number; currency?: boolean; signed?: boolean }) {
  const diff = a - b
  const fmt = (n: number) => (currency ? formatCurrency(n) : n.toLocaleString('ru-RU'))
  const diffColor = diff > 0 ? 'text-positive-500' : diff < 0 ? 'text-negative-500' : 'text-ink-500'
  return (
    <tr className="border-b border-ink-800/60">
      <td className="py-2.5 pr-4 text-ink-300">{label}</td>
      <td className="py-2.5 pr-4 text-ink-100 tabular-nums">{signed && a > 0 ? '+' : ''}{fmt(a)}</td>
      <td className="py-2.5 pr-4 text-ink-100 tabular-nums">{signed && b > 0 ? '+' : ''}{fmt(b)}</td>
      <td className={cn('py-2.5 pr-2 tabular-nums font-medium', diffColor)}>
        {diff > 0 ? '+' : ''}
        {fmt(diff)}
      </td>
    </tr>
  )
}
