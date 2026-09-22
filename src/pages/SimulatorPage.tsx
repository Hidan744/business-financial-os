import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ParamSlider } from '@/features/simulator/ParamSlider'
import { BeforeAfterCompare } from '@/features/simulator/BeforeAfterCompare'
import { CompareChart } from '@/features/simulator/CompareChart'
import { useFinancials } from '@/hooks/useFinancials'
import { useBusinessStore } from '@/store/businessStore'
import { calculateScenario } from '@/lib/finance/scenario'
import { buildFinancialSnapshot } from '@/lib/finance/snapshot'
import { splitFirstMonthPayment } from '@/lib/finance/loan'
import { calculateForecast } from '@/lib/finance/forecast'
import type { ScenarioMultipliers } from '@/types/scenario'
import { DEFAULT_MULTIPLIERS, STANDARD_SCENARIOS } from '@/types/scenario'
import { formatCurrency } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/tooltip'

type PctState = Record<Exclude<keyof ScenarioMultipliers, 'revenue'>, number>

const ZERO_PCT: PctState = {
  avgCheck: 0,
  salesCount: 0,
  cogs: 0,
  marketing: 0,
  payroll: 0,
  rent: 0,
  taxes: 0,
}

function toMultipliers(pct: PctState): ScenarioMultipliers {
  return {
    revenue: DEFAULT_MULTIPLIERS.revenue,
    avgCheck: 1 + pct.avgCheck / 100,
    salesCount: 1 + pct.salesCount / 100,
    cogs: 1 + pct.cogs / 100,
    marketing: 1 + pct.marketing / 100,
    payroll: 1 + pct.payroll / 100,
    rent: 1 + pct.rent / 100,
    taxes: 1 + pct.taxes / 100,
  }
}

const PRESETS: { label: string; pct: Partial<PctState> }[] = [
  { label: 'Увеличить цену на 10%', pct: { avgCheck: 10 } },
  { label: 'Увеличить рекламу на 30%', pct: { marketing: 30 } },
  { label: 'Увеличить продажи на 20%', pct: { salesCount: 20 } },
  { label: 'Снизить себестоимость на 5%', pct: { cogs: -5 } },
  { label: 'Нанять сотрудника', pct: { payroll: 15 } },
  { label: 'Открыть новую точку', pct: { avgCheck: 0, salesCount: 60, rent: 100, payroll: 50, marketing: 30 } },
  { label: 'Поднять зарплату на 15%', pct: { payroll: 15 } },
  { label: 'Увеличить аренду на 20%', pct: { rent: 20 } },
]

const DEFAULT_LOAN_AMOUNT = 1000000
const DEFAULT_LOAN_RATE_PCT = 18
const DEFAULT_LOAN_TERM_MONTHS = 12

export function SimulatorPage() {
  const { inputs } = useFinancials()
  const profile = useBusinessStore((s) => s.profile)
  const forecastConfig = useBusinessStore((s) => s.forecastConfig)
  const [pct, setPct] = useState<PctState>(ZERO_PCT)
  const [loanEnabled, setLoanEnabled] = useState(false)
  const [loanAmount, setLoanAmount] = useState(DEFAULT_LOAN_AMOUNT)
  const [loanRatePct, setLoanRatePct] = useState(DEFAULT_LOAN_RATE_PCT)
  const [loanTermMonths, setLoanTermMonths] = useState(DEFAULT_LOAN_TERM_MONTHS)

  const loanSplit = loanEnabled ? splitFirstMonthPayment(loanAmount, loanRatePct, loanTermMonths) : null

  const scenarioAfterInputs = useMemo(() => {
    if (!inputs) return null
    const scenarioInputs = calculateScenario(inputs, toMultipliers(pct))
    return loanSplit
      ? {
          ...scenarioInputs,
          loanInterest: scenarioInputs.loanInterest + loanSplit.interest,
          loanPayments: scenarioInputs.loanPayments + loanSplit.principalRepayment,
        }
      : scenarioInputs
  }, [inputs, pct, loanSplit])

  const comparison = useMemo(() => {
    if (!inputs || !scenarioAfterInputs) return null
    const before = buildFinancialSnapshot(inputs)
    const after = buildFinancialSnapshot(scenarioAfterInputs)
    return { before, after }
  }, [inputs, scenarioAfterInputs])

  // Влияние на 12 месяцев: та же модель роста (forecastConfig из раздела «Прогноз»), но с новой
  // "точкой отсчёта" — что если изменённые параметры станут новой нормой, а не разовым эффектом.
  const yearImpact = useMemo(() => {
    if (!inputs || !scenarioAfterInputs) return null
    const currentEmployeesCount = profile?.employeesCount ?? 1
    const beforePoints = calculateForecast(inputs, forecastConfig, { currentEmployeesCount })
    const afterPoints = calculateForecast(scenarioAfterInputs, forecastConfig, { currentEmployeesCount })
    const sum = (points: typeof beforePoints, key: 'revenue' | 'netProfit' | 'cashFlow') =>
      points.reduce((s, p) => s + p[key], 0)
    return {
      revenue: { before: sum(beforePoints, 'revenue'), after: sum(afterPoints, 'revenue') },
      netProfit: { before: sum(beforePoints, 'netProfit'), after: sum(afterPoints, 'netProfit') },
      cashFlow: { before: sum(beforePoints, 'cashFlow'), after: sum(afterPoints, 'cashFlow') },
    }
  }, [inputs, scenarioAfterInputs, forecastConfig, profile])

  const hasPriceIncrease = pct.avgCheck > 0
  const hasVolumeChange = pct.salesCount !== 0

  const canAfford = comparison
    ? comparison.after.netProfit >= 0 &&
      comparison.after.cashFlow >= 0 &&
      (comparison.after.dscr === null || comparison.after.dscr >= 1.2)
    : null

  const scenarioResults = useMemo(() => {
    if (!inputs) return []
    return STANDARD_SCENARIOS.map((scenario) => ({
      scenario,
      snapshot: buildFinancialSnapshot(calculateScenario(inputs, scenario.multipliers)),
    }))
  }, [inputs])

  if (!inputs || !comparison) return null

  function updatePct(key: keyof PctState, value: number) {
    setPct((p) => ({ ...p, [key]: value }))
  }

  function applyPreset(preset: Partial<PctState>) {
    setPct({ ...ZERO_PCT, ...preset })
  }

  function reset() {
    setPct(ZERO_PCT)
    setLoanEnabled(false)
    setLoanAmount(DEFAULT_LOAN_AMOUNT)
    setLoanRatePct(DEFAULT_LOAN_RATE_PCT)
    setLoanTermMonths(DEFAULT_LOAN_TERM_MONTHS)
  }

  const compareRows = [
    { label: 'Выручка', before: comparison.before.revenue, after: comparison.after.revenue, format: 'currency' as const },
    { label: 'Чистая прибыль', before: comparison.before.netProfit, after: comparison.after.netProfit, format: 'currency' as const },
    { label: 'EBITDA', before: comparison.before.ebitda, after: comparison.after.ebitda, format: 'currency' as const },
    { label: 'Cash Flow', before: comparison.before.cashFlow, after: comparison.after.cashFlow, format: 'currency' as const },
    { label: 'Маржа', before: comparison.before.netMarginPct, after: comparison.after.netMarginPct, format: 'percent' as const },
    { label: 'Точка безубыточности', before: comparison.before.breakEvenRevenue, after: comparison.after.breakEvenRevenue, format: 'currency' as const },
  ]

  const chartData = [
    { metric: 'Выручка', before: comparison.before.revenue, after: comparison.after.revenue },
    { metric: 'Чистая прибыль', before: comparison.before.netProfit, after: comparison.after.netProfit },
    { metric: 'EBITDA', before: comparison.before.ebitda, after: comparison.after.ebitda },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-50">Симулятор «Что будет, если…»</h1>
          <p className="text-sm text-ink-500 mt-1">Двигайте параметры и мгновенно смотрите Было → Стало.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={reset}>Сбросить</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button key={preset.label} variant="secondary" size="sm" onClick={() => applyPreset(preset.pct)}>
            {preset.label}
          </Button>
        ))}
        <Button variant="secondary" size="sm" onClick={() => setLoanEnabled(true)}>
          Взять кредит
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Параметры</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-5">
            <ParamSlider label="Средний чек / цена" value={pct.avgCheck} onChange={(v) => updatePct('avgCheck', v)} />
            <ParamSlider label="Количество продаж" value={pct.salesCount} onChange={(v) => updatePct('salesCount', v)} />
            <ParamSlider label="Себестоимость" value={pct.cogs} onChange={(v) => updatePct('cogs', v)} />
            <ParamSlider label="Реклама" value={pct.marketing} min={-50} max={100} onChange={(v) => updatePct('marketing', v)} />
            <ParamSlider label="ФОТ" value={pct.payroll} min={-50} max={100} onChange={(v) => updatePct('payroll', v)} />
            <ParamSlider label="Аренда" value={pct.rent} min={-50} max={100} onChange={(v) => updatePct('rent', v)} />
            <ParamSlider label="Налоги" value={pct.taxes} onChange={(v) => updatePct('taxes', v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Было → Стало</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <BeforeAfterCompare rows={compareRows} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Могу ли я себе это позволить?</CardTitle>
          <Button
            variant={loanEnabled ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setLoanEnabled((v) => !v)}
          >
            {loanEnabled ? 'Убрать кредит из расчёта' : 'Смоделировать кредит'}
          </Button>
        </CardHeader>
        {loanEnabled && (
          <CardContent className="pt-2 space-y-5">
            <div className="grid sm:grid-cols-3 gap-4">
              <LoanField label="Сумма кредита, ₽" value={loanAmount} onChange={setLoanAmount} />
              <LoanField label="Ставка, % годовых" value={loanRatePct} onChange={setLoanRatePct} />
              <LoanField label="Срок, мес" value={loanTermMonths} onChange={setLoanTermMonths} />
            </div>

            {loanSplit && (
              <div className="grid sm:grid-cols-3 gap-3">
                <ScenarioTile label="Ежемесячный платёж" value={formatCurrency(loanSplit.payment)} />
                <ScenarioTile label="Из них проценты (1-й мес.)" value={formatCurrency(loanSplit.interest)} />
                <ScenarioTile label="Из них тело кредита" value={formatCurrency(loanSplit.principalRepayment)} />
              </div>
            )}

            {canAfford !== null && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                  canAfford
                    ? 'border-positive-500/30 bg-positive-500/10 text-positive-500'
                    : 'border-negative-500/30 bg-negative-500/10 text-negative-500'
                }`}
              >
                {canAfford
                  ? 'С учётом остальных параметров сценария — можете себе это позволить: прибыль и cash flow остаются положительными, долговая нагрузка в норме.'
                  : 'Рискованно: при выбранных параметрах прибыль или cash flow уходят в минус, либо EBITDA не покрывает платежи по долгу с достаточным запасом.'}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {yearImpact && (pct.avgCheck !== 0 || pct.salesCount !== 0 || pct.cogs !== 0 || pct.marketing !== 0 || pct.payroll !== 0 || pct.rent !== 0 || pct.taxes !== 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              Влияние на 12 месяцев
              <InfoTooltip>
                Что изменится за 12 месяцев, если изменённые параметры станут новой нормой (при том же темпе роста,
                что настроен в разделе «Прогноз»), а не разовым эффектом одного месяца.
              </InfoTooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            <div className="grid sm:grid-cols-3 gap-3">
              <YearImpactTile label="Выручка" before={yearImpact.revenue.before} after={yearImpact.revenue.after} />
              <YearImpactTile label="Чистая прибыль" before={yearImpact.netProfit.before} after={yearImpact.netProfit.after} />
              <YearImpactTile label="Cash Flow" before={yearImpact.cashFlow.before} after={yearImpact.cashFlow.after} />
            </div>
            {hasPriceIncrease && !hasVolumeChange && (
              <p className="text-xs text-warning-500">
                Риск: расчёт предполагает, что количество продаж не изменится при росте цены. В реальности часть
                клиентов может уйти — если ожидаете отток, задайте отрицательный «Количество продаж» рядом, чтобы
                учесть его в сравнении.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Сравнение на графике</CardTitle>
        </CardHeader>
        <CardContent>
          <CompareChart data={chartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Сценарии</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Tabs defaultValue="base">
            <TabsList>
              {scenarioResults.map(({ scenario }) => (
                <TabsTrigger key={scenario.id} value={scenario.id}>{scenario.name}</TabsTrigger>
              ))}
            </TabsList>
            {scenarioResults.map(({ scenario, snapshot }) => (
              <TabsContent key={scenario.id} value={scenario.id} className="pt-5">
                <div className="grid sm:grid-cols-3 gap-3">
                  <ScenarioTile label="Выручка" value={formatCurrency(snapshot.revenue)} />
                  <ScenarioTile label="Чистая прибыль" value={formatCurrency(snapshot.netProfit)} accent={snapshot.netProfit >= 0} />
                  <ScenarioTile label="Cash Flow" value={formatCurrency(snapshot.cashFlow)} accent={snapshot.cashFlow >= 0} />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <p className="text-xs text-ink-600">Компания: {profile?.name}</p>
    </div>
  )
}

function YearImpactTile({ label, before, after }: { label: string; before: number; after: number }) {
  const delta = after - before
  return (
    <div className="rounded-xl border border-ink-800 px-4 py-3">
      <div className="text-xs text-ink-400 mb-1">{label}</div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-sm text-ink-500 line-through">{formatCurrency(before)}</span>
        <span className="text-lg font-semibold text-ink-50">{formatCurrency(after)}</span>
        <span className={`text-xs ${delta >= 0 ? 'text-positive-500' : 'text-negative-500'}`}>
          ({delta >= 0 ? '+' : ''}
          {formatCurrency(delta)})
        </span>
      </div>
    </div>
  )
}

function LoanField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-xs text-ink-400">{label}</span>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </label>
  )
}

function ScenarioTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-ink-800 px-4 py-3">
      <div className="text-xs text-ink-500 mb-1">{label}</div>
      <div className={`text-lg font-semibold ${accent === undefined ? 'text-ink-50' : accent ? 'text-positive-500' : 'text-negative-500'}`}>
        {value}
      </div>
    </div>
  )
}
