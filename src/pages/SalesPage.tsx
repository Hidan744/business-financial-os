import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InfoTooltip } from '@/components/ui/tooltip'
import { useFinancials } from '@/hooks/useFinancials'
import { useBusinessStore } from '@/store/businessStore'
import { getFixedCosts, getVariableCosts } from '@/lib/finance/snapshot'
import { buildCashFlowSummary } from '@/lib/finance/cashflow'
import {
  calculateAllowedCAC,
  calculateRequiredRevenueForNetProfit,
  calculateWithdrawableAmount,
} from '@/lib/finance/breakeven'
import { calculateContributionMarginPct } from '@/lib/finance/formulas'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'

const WORKING_DAYS_PER_MONTH = 30
const MONTHS_PER_YEAR = 12

export function SalesPage() {
  const { inputs, snapshot } = useFinancials()
  const cashFlowInputs = useBusinessStore((s) => s.cashFlowInputs)
  const taxSettings = useBusinessStore((s) => s.taxSettings)
  const [targetProfitInput, setTargetProfitInput] = useState('')
  const [annualTargetProfitInput, setAnnualTargetProfitInput] = useState('')
  const [minimumReserveInput, setMinimumReserveInput] = useState('')

  const targetProfit = useMemo(() => {
    const parsed = Number(targetProfitInput.replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  }, [targetProfitInput])

  const annualTargetProfit = useMemo(() => {
    const parsed = Number(annualTargetProfitInput.replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  }, [annualTargetProfitInput])

  // "Сколько чистыми" — это ЧИСТАЯ прибыль (после амортизации, процентов и налога), поэтому
  // нужная выручка ищется через тот же решатель, что использует Financial Plan и AI CFO —
  // единый источник истины, а не отдельная приблизительная формула на каждой странице.
  const result = useMemo(() => {
    if (!inputs) return null
    const fixedCosts = getFixedCosts(inputs)
    const variableCosts = getVariableCosts(inputs)
    const variableCostRatio = inputs.revenue > 0 ? variableCosts / inputs.revenue : 0
    const contributionMarginPct = calculateContributionMarginPct(inputs.revenue, inputs.cogs)
    const fallbackTaxRatePctOfRevenue = inputs.revenue > 0 ? inputs.taxes / inputs.revenue : 0

    const solved = calculateRequiredRevenueForNetProfit(
      targetProfit,
      fixedCosts,
      variableCostRatio,
      inputs.depreciation,
      inputs.loanInterest,
      inputs.avgCheck,
      { taxSettings, fallbackRatePctOfRevenue: fallbackTaxRatePctOfRevenue },
    )
    const requiredRevenue = solved.requiredRevenue
    const requiredSales = solved.requiredSales
    const requiredSalesPerDay = requiredSales !== null ? requiredSales / WORKING_DAYS_PER_MONTH : null
    const requiredAvgCheck = inputs.salesCount > 0 && requiredRevenue !== null ? requiredRevenue / inputs.salesCount : null
    const allowedCAC = calculateAllowedCAC(inputs.avgCheck, contributionMarginPct, targetProfit, requiredSales)
    // Приблизительно: при текущей выручке сколько нужна была бы маржа, чтобы прийти к цели — налог
    // и амортизация/проценты добавлены как текущая сумма (не пересчитываются от новой маржи).
    const requiredMarginPct =
      inputs.revenue > 0 ? ((targetProfit + fixedCosts + inputs.depreciation + inputs.loanInterest + inputs.taxes) / inputs.revenue) * 100 : null

    return {
      requiredRevenue,
      requiredSales,
      requiredSalesPerDay,
      requiredAvgCheck,
      allowedCAC,
      requiredMarginPct,
      fixedCosts,
      targetUnreachable: solved.status === 'target_unreachable',
    }
  }, [inputs, targetProfit, taxSettings])

  const annualResult = useMemo(() => {
    if (!inputs) return null
    const annualFixedCosts = getFixedCosts(inputs) * MONTHS_PER_YEAR
    const annualDepreciation = inputs.depreciation * MONTHS_PER_YEAR
    const annualInterest = inputs.loanInterest * MONTHS_PER_YEAR
    const variableCosts = getVariableCosts(inputs)
    const variableCostRatio = inputs.revenue > 0 ? variableCosts / inputs.revenue : 0
    const contributionMarginPct = calculateContributionMarginPct(inputs.revenue, inputs.cogs)
    const fallbackTaxRatePctOfRevenue = inputs.revenue > 0 ? inputs.taxes / inputs.revenue : 0

    const solved = calculateRequiredRevenueForNetProfit(
      annualTargetProfit,
      annualFixedCosts,
      variableCostRatio,
      annualDepreciation,
      annualInterest,
      inputs.avgCheck, // avgCheck is per-sale, not scaled by period length — required sales = revenue / avgCheck
      { taxSettings, fallbackRatePctOfRevenue: fallbackTaxRatePctOfRevenue },
    )
    const requiredAnnualRevenue = solved.requiredRevenue
    const requiredAnnualSales = solved.requiredSales
    const requiredSalesPerMonth = requiredAnnualSales !== null ? requiredAnnualSales / MONTHS_PER_YEAR : null
    const allowedCAC = calculateAllowedCAC(inputs.avgCheck, contributionMarginPct, annualTargetProfit / MONTHS_PER_YEAR, requiredSalesPerMonth)

    return { requiredAnnualRevenue, requiredAnnualSales, requiredSalesPerMonth, allowedCAC, targetUnreachable: solved.status === 'target_unreachable' }
  }, [inputs, annualTargetProfit, taxSettings])

  const cashBalance = cashFlowInputs ? buildCashFlowSummary(cashFlowInputs).closingBalance : 0
  const minimumReserve = useMemo(() => {
    const parsed = Number(minimumReserveInput.replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  }, [minimumReserveInput])
  const withdrawableNow = calculateWithdrawableAmount(cashBalance, minimumReserve)

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
              <FlowStep label="Цель (чистыми)" value={formatCurrency(targetProfit)} />
              {result.targetUnreachable ? (
                <p className="text-sm text-negative-500">
                  Недостижимо ни при какой выручке: переменные затраты съедают всю выручку (маржинальность ≤ 0) —
                  сначала нужно поднять цену или снизить себестоимость, рост продаж это не решит.
                </p>
              ) : (
                <>
                  <FlowStep label="Необходимая выручка" value={result.requiredRevenue !== null ? formatCurrency(result.requiredRevenue) : '—'} />
                  <FlowStep label="Продаж в месяц" value={result.requiredSales !== null ? formatNumber(result.requiredSales) : '—'} />
                  <FlowStep label="Продаж в день" value={result.requiredSalesPerDay !== null ? formatNumber(result.requiredSalesPerDay) : '—'} />
                  <FlowStep
                    label="Необходимый средний чек (при текущем кол-ве продаж)"
                    value={result.requiredAvgCheck !== null ? formatCurrency(result.requiredAvgCheck) : '—'}
                  />
                  <FlowStep
                    label="Допустимый CAC"
                    value={
                      result.allowedCAC.status === 'ok' && result.allowedCAC.cac !== null
                        ? formatCurrency(result.allowedCAC.cac)
                        : result.allowedCAC.status === 'target_unreachable'
                          ? 'цель недостижима при таком объёме продаж'
                          : '—'
                    }
                    tooltip="Максимальная стоимость привлечения одного клиента, при которой цель по прибыли ещё достижима. Если цель недостижима — реклама не может быть настолько дешёвой, чтобы это исправить; нужно менять цену, издержки или сам объём продаж."
                  />
                  <FlowStep
                    label="Необходимая маржа (при текущей выручке)"
                    value={result.requiredMarginPct !== null ? formatPercent(result.requiredMarginPct) : '—'}
                    tooltip="Приблизительно: какая маржинальность нужна при сегодняшней выручке, чтобы достичь цели без роста продаж. Налог, амортизация и проценты учтены по текущим суммам — не пересчитываются от новой маржи."
                  />
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Годовая цель</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-5">
          <div className="max-w-xs">
            <Label htmlFor="annual-target-profit">Сколько чистыми за год вы хотите получить?</Label>
            <Input
              id="annual-target-profit"
              inputMode="decimal"
              placeholder="Например, 6000000"
              value={annualTargetProfitInput}
              onChange={(e) => setAnnualTargetProfitInput(e.target.value)}
              className="mt-2"
            />
          </div>

          {annualTargetProfit > 0 && annualResult && (
            <div className="rounded-xl border border-ink-800 bg-ink-900/50 p-5 space-y-4">
              <FlowStep label="Цель на год (чистыми)" value={formatCurrency(annualTargetProfit)} />
              {annualResult.targetUnreachable ? (
                <p className="text-sm text-negative-500">
                  Недостижимо ни при какой выручке: переменные затраты съедают всю выручку (маржинальность ≤ 0) —
                  сначала нужно поднять цену или снизить себестоимость.
                </p>
              ) : (
                <>
                  <FlowStep
                    label="Необходимая годовая выручка"
                    value={annualResult.requiredAnnualRevenue !== null ? formatCurrency(annualResult.requiredAnnualRevenue) : '—'}
                  />
                  <FlowStep label="Продаж в год" value={annualResult.requiredAnnualSales !== null ? formatNumber(annualResult.requiredAnnualSales) : '—'} />
                  <FlowStep label="Продаж в месяц" value={annualResult.requiredSalesPerMonth !== null ? formatNumber(annualResult.requiredSalesPerMonth) : '—'} />
                  <FlowStep
                    label="Допустимый CAC"
                    value={
                      annualResult.allowedCAC.status === 'ok' && annualResult.allowedCAC.cac !== null
                        ? formatCurrency(annualResult.allowedCAC.cac)
                        : annualResult.allowedCAC.status === 'target_unreachable'
                          ? 'цель недостижима при таком объёме продаж'
                          : '—'
                    }
                    tooltip="Максимальная стоимость привлечения одного клиента, при которой годовая цель по прибыли ещё достижима."
                  />
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Сколько можно вывести
            <InfoTooltip>
              Сколько денег можно безопасно вывести из бизнеса прямо сейчас, не опускаясь ниже минимального резерва —
              суммы, которую вы держите на непредвиденные расходы.
            </InfoTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Metric label="Текущий остаток денег" value={formatCurrency(cashBalance)} />
            <div className="max-w-xs">
              <Label htmlFor="minimum-reserve">Минимальный резерв, ₽</Label>
              <Input
                id="minimum-reserve"
                inputMode="decimal"
                placeholder="Например, 500000"
                value={minimumReserveInput}
                onChange={(e) => setMinimumReserveInput(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          <div className="rounded-xl border border-ink-800 bg-ink-900/50 p-5">
            <FlowStep
              label="Можно вывести сейчас"
              value={formatCurrency(withdrawableNow)}
              tooltip="Остаток денег на конец периода (из раздела Cash Flow) минус минимальный резерв."
            />
          </div>
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
