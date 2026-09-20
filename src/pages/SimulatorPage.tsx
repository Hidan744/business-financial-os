import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ParamSlider } from '@/features/simulator/ParamSlider'
import { BeforeAfterCompare } from '@/features/simulator/BeforeAfterCompare'
import { CompareChart } from '@/features/simulator/CompareChart'
import { useFinancials } from '@/hooks/useFinancials'
import { useBusinessStore } from '@/store/businessStore'
import { calculateScenario } from '@/lib/finance/scenario'
import { buildFinancialSnapshot } from '@/lib/finance/snapshot'
import type { ScenarioMultipliers } from '@/types/scenario'
import { DEFAULT_MULTIPLIERS, STANDARD_SCENARIOS } from '@/types/scenario'
import { formatCurrency } from '@/lib/utils'

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
]

export function SimulatorPage() {
  const { inputs } = useFinancials()
  const profile = useBusinessStore((s) => s.profile)
  const [pct, setPct] = useState<PctState>(ZERO_PCT)

  const comparison = useMemo(() => {
    if (!inputs) return null
    const before = buildFinancialSnapshot(inputs)
    const scenarioInputs = calculateScenario(inputs, toMultipliers(pct))
    const after = buildFinancialSnapshot(scenarioInputs)
    return { before, after }
  }, [inputs, pct])

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
