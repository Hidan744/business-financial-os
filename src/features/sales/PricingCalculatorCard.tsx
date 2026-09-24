import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { InfoTooltip } from '@/components/ui/tooltip'
import {
  calculateBreakEvenUnitsAtPrice,
  calculateMarginPct,
  calculateMarkupPct,
  calculateOverheadPerUnit,
  calculatePriceFromMargin,
  calculatePriceFromMarkup,
  calculatePriceWithVat,
  type PricingMethod,
} from '@/lib/finance/pricing'
import { formatCurrency, formatNumber, formatPercent, cn } from '@/lib/utils'
import type { Product } from '@/types/inventory'

function parseAmount(raw: string): number {
  const v = Number(raw.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(v) && v >= 0 ? v : 0
}

export function PricingCalculatorCard({
  defaultFixedCosts,
  products,
  showProductPicker,
  isVatPayer,
  vatRatePct,
}: {
  defaultFixedCosts: number
  products: Product[]
  showProductPicker: boolean
  isVatPayer: boolean
  vatRatePct: number
}) {
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [costInput, setCostInput] = useState('')
  const [fixedCostsInput, setFixedCostsInput] = useState(String(Math.round(defaultFixedCosts)))
  const [volumeInput, setVolumeInput] = useState('')
  const [method, setMethod] = useState<PricingMethod>('markup')
  const [targetPctInput, setTargetPctInput] = useState('40')
  const [competitorInput, setCompetitorInput] = useState('')

  const costPerUnit = parseAmount(costInput)
  const fixedCosts = parseAmount(fixedCostsInput)
  const expectedVolume = parseAmount(volumeInput)
  const targetPct = parseAmount(targetPctInput)
  const competitorPrice = parseAmount(competitorInput)

  const result = useMemo(() => {
    const overheadPerUnit = calculateOverheadPerUnit(fixedCosts, expectedVolume)
    const fullCost = costPerUnit + overheadPerUnit
    const priceExVat = method === 'markup' ? calculatePriceFromMarkup(fullCost, targetPct) : calculatePriceFromMargin(fullCost, targetPct)

    if (priceExVat === null) {
      return { ok: false as const }
    }

    const finalPrice = isVatPayer ? calculatePriceWithVat(priceExVat, vatRatePct) : priceExVat
    const profitPerUnit = priceExVat - fullCost
    const markupPct = calculateMarkupPct(priceExVat, fullCost)
    const marginPct = calculateMarginPct(priceExVat, fullCost)
    const breakEvenUnits = calculateBreakEvenUnitsAtPrice(fixedCosts, priceExVat, costPerUnit)

    return { ok: true as const, priceExVat, finalPrice, profitPerUnit, markupPct, marginPct, breakEvenUnits }
  }, [costPerUnit, fixedCosts, expectedVolume, method, targetPct, isVatPayer, vatRatePct])

  function pickProduct(id: string) {
    setSelectedProductId(id)
    const product = products.find((p) => p.id === id)
    if (product) setCostInput(String(product.costPerUnit))
  }

  const hasInput = costPerUnit > 0
  const competitorDiffPct = result.ok && competitorPrice > 0 ? ((result.finalPrice - competitorPrice) / competitorPrice) * 100 : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Цена на товар или услугу
          <InfoTooltip>
            Наценка (% от себестоимости) и маржа (% от цены продажи) — разная арифметика от одной и той же цифры,
            результат отличается. Указывайте явно, что имеете в виду.
          </InfoTooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 space-y-5">
        {showProductPicker && (
          <div className="max-w-sm">
            <Label>Товар со склада (необязательно)</Label>
            <Select value={selectedProductId} onValueChange={pickProduct}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Выбрать товар, чтобы подставить себестоимость" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(p.costPerUnit)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pc-cost">Себестоимость за единицу, ₽</Label>
            <Input id="pc-cost" inputMode="decimal" placeholder="Например, 450" value={costInput} onChange={(e) => setCostInput(e.target.value)} className="mt-2" />
          </div>
          <div>
            <Label htmlFor="pc-volume" className="flex items-center gap-1.5">
              Ожид. продаж/период, шт
              <InfoTooltip>Для распределения постоянных расходов на единицу. Оставьте пустым, если не хотите учитывать накладные — тогда цена посчитается только от прямой себестоимости.</InfoTooltip>
            </Label>
            <Input id="pc-volume" inputMode="decimal" placeholder="Например, 200" value={volumeInput} onChange={(e) => setVolumeInput(e.target.value)} className="mt-2" />
          </div>
        </div>

        <div>
          <Label htmlFor="pc-fixed">Постоянные расходы за период, ₽</Label>
          <Input id="pc-fixed" inputMode="decimal" value={fixedCostsInput} onChange={(e) => setFixedCostsInput(e.target.value)} className="mt-2 max-w-xs" />
          <p className="text-xs text-ink-500 mt-1.5">Подставлены текущие расходы из «Финансов» — можно изменить.</p>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <Label>Метод ценообразования</Label>
            <div className="flex gap-1 rounded-lg bg-ink-950/50 p-1 mt-2">
              <MethodButton active={method === 'markup'} onClick={() => setMethod('markup')} label="Наценка" />
              <MethodButton active={method === 'margin'} onClick={() => setMethod('margin')} label="Маржа" />
            </div>
          </div>
          <div>
            <Label htmlFor="pc-target">Целевое значение, %</Label>
            <Input
              id="pc-target"
              inputMode="decimal"
              value={targetPctInput}
              onChange={(e) => setTargetPctInput(e.target.value)}
              className="mt-2 max-w-[120px]"
            />
          </div>
        </div>

        {hasInput && (
          <div className="rounded-xl border border-ink-800 bg-ink-900/50 p-5 space-y-4">
            {!result.ok ? (
              <p className="text-sm text-negative-500">
                Маржа {formatPercent(targetPct)} математически невозможна (100% и больше означает бесконечную или
                отрицательную цену) — уменьшите целевое значение.
              </p>
            ) : (
              <>
                <div>
                  <div className="text-xs text-ink-400 mb-1">
                    {isVatPayer ? 'Рекомендуемая цена (с НДС)' : 'Рекомендуемая цена'}
                  </div>
                  <div className="text-2xl font-bold text-ink-50">{formatCurrency(result.finalPrice)}</div>
                  {isVatPayer && <div className="text-xs text-ink-500 mt-1">Без НДС: {formatCurrency(result.priceExVat)}</div>}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <FlowStat label="Наценка факт." value={result.markupPct !== null ? formatPercent(result.markupPct) : '—'} />
                  <FlowStat label="Маржа факт." value={result.marginPct !== null ? formatPercent(result.marginPct) : '—'} />
                  <FlowStat
                    label="Прибыль с единицы"
                    value={formatCurrency(result.profitPerUnit)}
                    tooltip="До налога с прибыли. Не включает НДС — это не доход бизнеса, а сумма, которую нужно передать в бюджет."
                  />
                  <FlowStat
                    label="Безубыточность"
                    value={result.breakEvenUnits !== null ? `${formatNumber(Math.ceil(result.breakEvenUnits))} шт/период` : '—'}
                    tooltip="Сколько единиц нужно продать за период, чтобы покрыть постоянные расходы при этой цене."
                  />
                </div>

                <div className="max-w-xs">
                  <Label htmlFor="pc-competitor">Цена конкурентов, ₽ (необязательно)</Label>
                  <Input
                    id="pc-competitor"
                    inputMode="decimal"
                    placeholder="Например, 780"
                    value={competitorInput}
                    onChange={(e) => setCompetitorInput(e.target.value)}
                    className="mt-2"
                  />
                </div>
                {competitorDiffPct !== null && (
                  <p className={cn('text-sm', competitorDiffPct > 0 ? 'text-warning-500' : 'text-positive-500')}>
                    {competitorDiffPct > 0
                      ? `Выше цены конкурентов на ${formatPercent(Math.abs(competitorDiffPct))}`
                      : competitorDiffPct < 0
                        ? `Ниже цены конкурентов на ${formatPercent(Math.abs(competitorDiffPct))}`
                        : 'Совпадает с ценой конкурентов'}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MethodButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
        active ? 'bg-ink-800 text-ink-50' : 'text-ink-500 hover:text-ink-200',
      )}
    >
      {label}
    </button>
  )
}

function FlowStat({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  return (
    <div>
      <div className="text-xs text-ink-400 mb-1 flex items-center gap-1.5">
        {label}
        {tooltip && <InfoTooltip>{tooltip}</InfoTooltip>}
      </div>
      <div className="text-sm font-semibold text-ink-50">{value}</div>
    </div>
  )
}
