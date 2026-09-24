import { useState } from 'react'
import { AlertTriangle, Package, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { InfoTooltip } from '@/components/ui/tooltip'
import { useBusinessStore } from '@/store/businessStore'
import { buildStockStatus, type StockStatusLevel } from '@/lib/finance/inventory'
import { STOCK_MOVEMENT_TYPE_LABELS, type StockMovementType } from '@/types/inventory'
import { InventoryCalendarCard } from '@/features/inventory/InventoryCalendarCard'
import { formatCurrency, cn } from '@/lib/utils'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function InventoryPage() {
  const products = useBusinessStore((s) => s.products)
  const stockMovements = useBusinessStore((s) => s.stockMovements)
  const addProduct = useBusinessStore((s) => s.addProduct)
  const removeProduct = useBusinessStore((s) => s.removeProduct)
  const addStockMovement = useBusinessStore((s) => s.addStockMovement)
  const removeStockMovement = useBusinessStore((s) => s.removeStockMovement)

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [unit, setUnit] = useState('шт')
  const [minStockLevel, setMinStockLevel] = useState('')
  const [costPerUnit, setCostPerUnit] = useState('')

  const [moveProductId, setMoveProductId] = useState('')
  const [moveType, setMoveType] = useState<StockMovementType>('receipt')
  const [moveQuantity, setMoveQuantity] = useState('')
  const [moveDate, setMoveDate] = useState(today())
  const [moveCost, setMoveCost] = useState('')
  const [moveNote, setMoveNote] = useState('')

  const asOfDate = today()
  const statuses = products.map((p) => buildStockStatus(p, stockMovements, asOfDate))
  const statusById = new Map(statuses.map((s) => [s.productId, s]))

  const totalValue = statuses.reduce((sum, s) => sum + s.value, 0)
  const lowCount = statuses.filter((s) => s.level === 'low').length
  const criticalCount = statuses.filter((s) => s.level === 'critical').length

  const recentMovements = [...stockMovements].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)

  function parseNumber(v: string): number {
    const n = Number(v.replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }

  function submitProduct() {
    if (!name.trim() || !sku.trim()) return
    addProduct({
      name: name.trim(),
      sku: sku.trim(),
      unit: unit.trim() || 'шт',
      minStockLevel: Math.max(0, parseNumber(minStockLevel)),
      costPerUnit: Math.max(0, parseNumber(costPerUnit)),
    })
    setName('')
    setSku('')
    setUnit('шт')
    setMinStockLevel('')
    setCostPerUnit('')
  }

  function submitMovement() {
    const quantity = parseNumber(moveQuantity)
    if (!moveProductId || quantity <= 0 || !moveDate) return
    addStockMovement({
      productId: moveProductId,
      date: moveDate,
      type: moveType,
      quantity,
      costPerUnit: moveType === 'receipt' && moveCost ? parseNumber(moveCost) : undefined,
      note: moveNote.trim() || undefined,
    })
    setMoveQuantity('')
    setMoveCost('')
    setMoveNote('')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50 flex items-center gap-2">
          <Package className="size-6 text-brand-400" /> Склад
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          Остаток считается автоматически по движениям (приход − расход), а не вводится вручную.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-ink-400 mb-1">Стоимость склада</div>
          <div className="text-lg font-semibold text-ink-50">{formatCurrency(totalValue)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-ink-400 mb-1">Товаров</div>
          <div className="text-lg font-semibold text-ink-50">{products.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-ink-400 mb-1">Мало на складе</div>
          <div className={cn('text-lg font-semibold', lowCount > 0 ? 'text-warning-500' : 'text-ink-50')}>{lowCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-ink-400 mb-1">Критично (остаток 0)</div>
          <div className={cn('text-lg font-semibold', criticalCount > 0 ? 'text-negative-500' : 'text-ink-50')}>{criticalCount}</div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Товары
            <InfoTooltip>
              Остаток = сумма приходов минус расходы (продажи, списания) по журналу движений ниже.
              «Мало на складе» — остаток ниже заданного порога ИЛИ при текущем темпе продаж закончится
              меньше чем за 7 дней. «Критично» — остаток уже 0 или отрицательный.
            </InfoTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          {products.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-500 border-b border-ink-800">
                    <th className="py-2 pr-4 font-medium">Товар</th>
                    <th className="py-2 pr-4 font-medium">SKU</th>
                    <th className="py-2 pr-4 font-medium text-right">Остаток</th>
                    <th className="py-2 pr-4 font-medium">Статус</th>
                    <th className="py-2 pr-4 font-medium text-right">Хватит на</th>
                    <th className="py-2 pr-4 font-medium text-right">Стоимость</th>
                    <th className="py-2 pr-2 font-medium w-8" />
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const status = statusById.get(p.id)
                    return (
                      <tr key={p.id} className="border-b border-ink-800/60">
                        <td className="py-2.5 pr-4 text-ink-200">{p.name}</td>
                        <td className="py-2.5 pr-4 text-ink-400">{p.sku}</td>
                        <td className="py-2.5 pr-4 text-right text-ink-100 tabular-nums">
                          {status?.onHand ?? 0} {p.unit}
                        </td>
                        <td className="py-2.5 pr-4">
                          <StatusBadge level={status?.level ?? 'ok'} />
                        </td>
                        <td className="py-2.5 pr-4 text-right text-ink-300 tabular-nums">
                          {status?.runwayDays !== null && status?.runwayDays !== undefined
                            ? `${Math.round(status.runwayDays)} дн.`
                            : '—'}
                        </td>
                        <td className="py-2.5 pr-4 text-right text-ink-100 tabular-nums">{formatCurrency(status?.value ?? 0)}</td>
                        <td className="py-2.5 pr-2 text-right">
                          <button
                            onClick={() => removeProduct(p.id)}
                            className="text-ink-500 hover:text-negative-500 transition-colors"
                            aria-label={`Удалить ${p.name}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid sm:grid-cols-5 gap-2 items-end">
            <div className="sm:col-span-1">
              <label className="text-xs text-ink-400 block mb-1">Название</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Худи чёрное" />
            </div>
            <div className="sm:col-span-1">
              <label className="text-xs text-ink-400 block mb-1">SKU</label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="HD-001" />
            </div>
            <div className="sm:col-span-1">
              <label className="text-xs text-ink-400 block mb-1">Ед.</label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="шт" />
            </div>
            <div className="sm:col-span-1">
              <label className="text-xs text-ink-400 block mb-1">Мин. порог</label>
              <Input inputMode="decimal" value={minStockLevel} onChange={(e) => setMinStockLevel(e.target.value)} placeholder="20" />
            </div>
            <Button onClick={submitProduct} className="sm:col-span-1">
              Добавить
            </Button>
          </div>
          <div className="max-w-xs">
            <label className="text-xs text-ink-400 block mb-1">Закупочная себестоимость, ₽/ед.</label>
            <Input inputMode="decimal" value={costPerUnit} onChange={(e) => setCostPerUnit(e.target.value)} placeholder="1500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Движение товара
            <InfoTooltip>
              Приход — товар поступил (закупка, производство партии). Продажа и списание уменьшают
              остаток. Корректировка — ручное исправление (пересчёт, обнаруженная ошибка).
            </InfoTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          {products.length === 0 ? (
            <p className="text-sm text-ink-500">Сначала добавьте хотя бы один товар выше.</p>
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Товар</Label>
                  <Select value={moveProductId} onValueChange={setMoveProductId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Выберите товар" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Тип движения</Label>
                  <Select value={moveType} onValueChange={(v) => setMoveType(v as StockMovementType)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STOCK_MOVEMENT_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Дата</Label>
                  <Input type="date" className="mt-1 w-auto" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-2 items-end">
                <div>
                  <Label className="text-xs">Количество</Label>
                  <Input inputMode="decimal" className="mt-1" value={moveQuantity} onChange={(e) => setMoveQuantity(e.target.value)} placeholder="10" />
                </div>
                {moveType === 'receipt' && (
                  <div>
                    <Label className="text-xs">Закупочная цена, ₽/ед. (опц.)</Label>
                    <Input inputMode="decimal" className="mt-1" value={moveCost} onChange={(e) => setMoveCost(e.target.value)} placeholder="1500" />
                  </div>
                )}
                <div className={moveType === 'receipt' ? '' : 'sm:col-span-2'}>
                  <Label className="text-xs">Комментарий (опц.)</Label>
                  <Input className="mt-1" value={moveNote} onChange={(e) => setMoveNote(e.target.value)} placeholder="Поставка от 12.09" />
                </div>
              </div>
              <Button onClick={submitMovement}>Записать движение</Button>
            </>
          )}

          {recentMovements.length > 0 && (
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-500 border-b border-ink-800">
                    <th className="py-2 pr-4 font-medium whitespace-nowrap">Дата</th>
                    <th className="py-2 pr-4 font-medium">Товар</th>
                    <th className="py-2 pr-4 font-medium">Тип</th>
                    <th className="py-2 pr-4 font-medium text-right">Кол-во</th>
                    <th className="py-2 pr-4 font-medium">Комментарий</th>
                    <th className="py-2 pr-2 font-medium w-8" />
                  </tr>
                </thead>
                <tbody>
                  {recentMovements.map((m) => {
                    const p = products.find((pr) => pr.id === m.productId)
                    return (
                      <tr key={m.id} className="border-b border-ink-800/60">
                        <td className="py-2 pr-4 text-ink-400 whitespace-nowrap">{m.date}</td>
                        <td className="py-2 pr-4 text-ink-200">{p?.name ?? '—'}</td>
                        <td className="py-2 pr-4 text-ink-300">{STOCK_MOVEMENT_TYPE_LABELS[m.type]}</td>
                        <td className="py-2 pr-4 text-right text-ink-100 tabular-nums">{m.quantity}</td>
                        <td className="py-2 pr-4 text-ink-500">{m.note ?? '—'}</td>
                        <td className="py-2 pr-2 text-right">
                          <button
                            onClick={() => removeStockMovement(m.id)}
                            className="text-ink-500 hover:text-negative-500 transition-colors"
                            aria-label="Удалить движение"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <InventoryCalendarCard products={products} stockMovements={stockMovements} />
    </div>
  )
}

function StatusBadge({ level }: { level: StockStatusLevel }) {
  if (level === 'critical') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-negative-500 bg-negative-500/10 rounded-full px-2 py-0.5">
        <AlertTriangle className="size-3" /> Критично
      </span>
    )
  }
  if (level === 'low') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-warning-500 bg-warning-500/10 rounded-full px-2 py-0.5">
        <AlertTriangle className="size-3" /> Мало
      </span>
    )
  }
  return <span className="inline-flex items-center text-xs font-medium text-positive-500 bg-positive-500/10 rounded-full px-2 py-0.5">Ок</span>
}
