import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InfoTooltip } from '@/components/ui/tooltip'
import { useFinancials } from '@/hooks/useFinancials'
import { useBusinessStore } from '@/store/businessStore'
import { calculateApproxCostPerSale } from '@/lib/finance/formulas'
import {
  calculateCustomerLifetimeMonths,
  calculateLTV,
  calculateLtvCacRatio,
  calculatePaybackMonths,
} from '@/lib/finance/unitEconomics'
import { formatCurrency } from '@/lib/utils'

export function UnitEconomicsPage() {
  const { inputs, snapshot } = useFinancials()
  const unitEconomics = useBusinessStore((s) => s.unitEconomics)
  const updateUnitEconomics = useBusinessStore((s) => s.updateUnitEconomics)

  const [manualCacInput, setManualCacInput] = useState(unitEconomics.manualCac !== null ? String(unitEconomics.manualCac) : '')

  if (!inputs || !snapshot) return null

  const approxCac = calculateApproxCostPerSale(inputs.marketing, inputs.salesCount)
  const cac = unitEconomics.manualCac ?? approxCac ?? 0
  const cacIsManual = unitEconomics.manualCac !== null

  const lifetimeMonths = calculateCustomerLifetimeMonths(unitEconomics.monthlyChurnRatePct)
  const ltv =
    lifetimeMonths !== null
      ? calculateLTV(inputs.avgCheck, snapshot.grossMarginPct, unitEconomics.purchaseFrequencyPerMonth, lifetimeMonths)
      : null
  const ltvCacRatio = ltv !== null ? calculateLtvCacRatio(ltv, cac) : null
  const paybackMonths = calculatePaybackMonths(cac, inputs.avgCheck, snapshot.grossMarginPct, unitEconomics.purchaseFrequencyPerMonth)

  function applyManualCac() {
    const parsed = Number(manualCacInput.replace(/\s/g, '').replace(',', '.'))
    updateUnitEconomics({ manualCac: manualCacInput.trim() === '' || !Number.isFinite(parsed) || parsed <= 0 ? null : parsed })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Unit-экономика</h1>
        <p className="text-sm text-ink-500 mt-1">
          LTV считается по вашим предположениям о частоте покупок и оттоке — система не отслеживает повторные покупки
          конкретных клиентов, поэтому не может вычислить эти цифры сама.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            CAC — стоимость привлечения клиента
            <InfoTooltip>
              По умолчанию используется оценка: расходы на рекламу ÷ количество продаж (та же, что на Dashboard). Если
              вы отслеживаете реальный CAC отдельно (например, из рекламного кабинета) — введите его вручную.
            </InfoTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-ink-800 px-4 py-3">
              <div className="text-xs text-ink-400 mb-1">Оценка (реклама / продажи)</div>
              <div className="text-lg font-semibold text-ink-50">{approxCac !== null ? formatCurrency(approxCac) : '—'}</div>
            </div>
            <div>
              <Label htmlFor="manual-cac">Точный CAC, ₽ (опционально)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="manual-cac"
                  inputMode="decimal"
                  value={manualCacInput}
                  onChange={(e) => setManualCacInput(e.target.value)}
                  onBlur={applyManualCac}
                  placeholder="Оставьте пустым, чтобы использовать оценку"
                />
              </div>
            </div>
          </div>
          <div className="text-xs text-ink-500">
            Используется в расчётах ниже: <span className="text-ink-300 font-medium">{formatCurrency(cac)}</span>
            {cacIsManual ? ' (введённое вами значение)' : ' (оценка)'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Предположения для LTV</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="purchase-frequency">Покупок на клиента в месяц</Label>
              <Input
                id="purchase-frequency"
                inputMode="decimal"
                value={unitEconomics.purchaseFrequencyPerMonth}
                onChange={(e) => {
                  const v = Number(e.target.value.replace(/\s/g, '').replace(',', '.'))
                  updateUnitEconomics({ purchaseFrequencyPerMonth: Number.isFinite(v) && v >= 0 ? v : 0 })
                }}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="churn-rate">Отток клиентов в месяц, %</Label>
              <Input
                id="churn-rate"
                inputMode="decimal"
                value={unitEconomics.monthlyChurnRatePct}
                onChange={(e) => {
                  const v = Number(e.target.value.replace(/\s/g, '').replace(',', '.'))
                  updateUnitEconomics({ monthlyChurnRatePct: Number.isFinite(v) && v >= 0 ? v : 0 })
                }}
                className="mt-2"
              />
            </div>
          </div>
          <div className="text-xs text-ink-500">
            Срок жизни клиента при таком оттоке:{' '}
            <span className="text-ink-300 font-medium">{lifetimeMonths !== null ? `${lifetimeMonths.toFixed(1)} мес.` : '—'}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Результат</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid sm:grid-cols-3 gap-4">
            <ResultTile
              label="LTV"
              value={ltv !== null ? formatCurrency(ltv) : '—'}
              tooltip="Средний чек × валовая маржа × покупок в месяц × срок жизни клиента."
            />
            <ResultTile
              label="LTV : CAC"
              value={ltvCacRatio !== null ? `${ltvCacRatio.toFixed(1)}×` : '—'}
              tooltip="Меньше 1× — вы теряете деньги на каждом клиенте. 3× и выше обычно считается здоровым уровнем."
              accent={ltvCacRatio === null ? undefined : ltvCacRatio >= 3 ? 'positive' : ltvCacRatio >= 1 ? 'neutral' : 'negative'}
            />
            <ResultTile
              label="Payback period"
              value={paybackMonths !== null ? `${paybackMonths.toFixed(1)} мес.` : '—'}
              tooltip="Через сколько месяцев валовая прибыль с клиента окупает стоимость его привлечения."
              accent={paybackMonths === null ? undefined : paybackMonths <= 12 ? 'positive' : 'neutral'}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ResultTile({
  label,
  value,
  tooltip,
  accent,
}: {
  label: string
  value: string
  tooltip?: string
  accent?: 'positive' | 'neutral' | 'negative'
}) {
  const color = accent === 'positive' ? 'text-positive-500' : accent === 'negative' ? 'text-negative-500' : 'text-ink-50'
  return (
    <div className="rounded-xl border border-ink-800 px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-ink-400 mb-1">
        {label}
        {tooltip && <InfoTooltip>{tooltip}</InfoTooltip>}
      </div>
      <div className={`text-xl font-semibold ${color}`}>{value}</div>
    </div>
  )
}
