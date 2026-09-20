import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InfoTooltip } from '@/components/ui/tooltip'
import { useFinancials } from '@/hooks/useFinancials'
import { getFixedCosts } from '@/lib/finance/snapshot'
import {
  calculateAllowedCAC,
  calculateRequiredRevenue,
  calculateRequiredSales,
} from '@/lib/finance/breakeven'
import { calculateContributionMarginPct } from '@/lib/finance/formulas'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'

const WORKING_DAYS_PER_MONTH = 30

export function SalesPage() {
  const { inputs, snapshot } = useFinancials()
  const [targetProfitInput, setTargetProfitInput] = useState('')

  const targetProfit = useMemo(() => {
    const parsed = Number(targetProfitInput.replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  }, [targetProfitInput])

  const result = useMemo(() => {
    if (!inputs) return null
    const fixedCosts = getFixedCosts(inputs)
    const contributionMarginPct = calculateContributionMarginPct(inputs.revenue, inputs.cogs)
    const requiredRevenue = calculateRequiredRevenue(targetProfit, fixedCosts, contributionMarginPct)
    const requiredSales = calculateRequiredSales(requiredRevenue, inputs.avgCheck)
    const requiredSalesPerDay = requiredSales !== null ? requiredSales / WORKING_DAYS_PER_MONTH : null
    const requiredAvgCheck = inputs.salesCount > 0 && requiredRevenue !== null ? requiredRevenue / inputs.salesCount : null
    const allowedCAC = calculateAllowedCAC(inputs.avgCheck, contributionMarginPct, targetProfit, requiredSales)
    const requiredMarginPct =
      inputs.revenue > 0 ? ((targetProfit + fixedCosts) / inputs.revenue) * 100 : null

    return { requiredRevenue, requiredSales, requiredSalesPerDay, requiredAvgCheck, allowedCAC, requiredMarginPct, fixedCosts }
  }, [inputs, targetProfit])

  if (!inputs || !snapshot) return null

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Продажи</h1>
        <p className="text-sm text-ink-500 mt-1">Точка безубыточности и расчёт целевого дохода.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Точка безубыточности
            <InfoTooltip>Минимальная выручка, при которой бизнес не уходит в убыток: постоянные расходы ÷ маржинальность.</InfoTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          <p className="text-sm text-ink-300">
            Чтобы выйти в ноль, вам необходимо делать минимум{' '}
            <span className="font-semibold text-ink-50">{formatCurrency(snapshot.breakEvenRevenue)}</span> выручки за период.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Metric label="Break-even revenue" value={formatCurrency(snapshot.breakEvenRevenue)} />
            <Metric label="Break-even sales" value={`${formatNumber(snapshot.breakEvenSales)} продаж`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Целевой доход</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-5">
          <div className="max-w-xs">
            <Label htmlFor="target-profit">Сколько чистыми в месяц вы хотите получать?</Label>
            <Input
              id="target-profit"
              inputMode="decimal"
              placeholder="Например, 500000"
              value={targetProfitInput}
              onChange={(e) => setTargetProfitInput(e.target.value)}
              className="mt-2"
            />
          </div>

          {targetProfit > 0 && result && (
            <div className="rounded-xl border border-ink-800 bg-ink-900/50 p-5 space-y-4">
              <FlowStep label="Цель" value={formatCurrency(targetProfit)} />
              <FlowStep label="Необходимая выручка" value={result.requiredRevenue !== null ? formatCurrency(result.requiredRevenue) : 'недостижимо при текущей марже'} />
              <FlowStep label="Продаж в месяц" value={result.requiredSales !== null ? formatNumber(result.requiredSales) : '—'} />
              <FlowStep label="Продаж в день" value={result.requiredSalesPerDay !== null ? formatNumber(result.requiredSalesPerDay) : '—'} />
              <FlowStep
                label="Необходимый средний чек (при текущем кол-ве продаж)"
                value={result.requiredAvgCheck !== null ? formatCurrency(result.requiredAvgCheck) : '—'}
              />
              <FlowStep
                label="Допустимый CAC"
                value={result.allowedCAC !== null ? formatCurrency(result.allowedCAC) : '—'}
                tooltip="Максимальная стоимость привлечения одного клиента, при которой цель по прибыли ещё достижима."
              />
              <FlowStep
                label="Необходимая маржа (при текущей выручке)"
                value={result.requiredMarginPct !== null ? formatPercent(result.requiredMarginPct) : '—'}
                tooltip="Какая маржинальность нужна, чтобы достичь цели без роста продаж."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-800 px-4 py-3">
      <div className="text-xs text-ink-500 mb-1">{label}</div>
      <div className="text-lg font-semibold text-ink-50">{value}</div>
    </div>
  )
}

function FlowStep({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-ink-400 flex items-center gap-1.5">
        {label}
        {tooltip && <InfoTooltip>{tooltip}</InfoTooltip>}
      </span>
      <span className="text-sm font-semibold text-ink-50">{value}</span>
    </div>
  )
}
