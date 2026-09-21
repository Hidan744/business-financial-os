import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useFinancials } from '@/hooks/useFinancials'
import { useBusinessStore } from '@/store/businessStore'
import { buildFinancialSnapshot } from '@/lib/finance/snapshot'
import { buildCashFlowSummary } from '@/lib/finance/cashflow'
import {
  applyClientLossShock,
  applyCogsShock,
  applyFixedCostShock,
  applyRevenueShock,
  calculateFundingNeeded,
  calculateRunwayMonths,
} from '@/lib/finance/stressTest'
import type { FinancialInputs } from '@/types/finance'
import { formatCurrency, formatPercent } from '@/lib/utils'

const FUNDING_HORIZON_MONTHS = 6

export function StressTestPage() {
  const { inputs } = useFinancials()
  const cashFlowInputs = useBusinessStore((s) => s.cashFlowInputs)
  const [clientLossPct, setClientLossPct] = useState(20)

  const cashBalance = cashFlowInputs ? buildCashFlowSummary(cashFlowInputs).closingBalance : 0

  const scenarios = useMemo(
    () => [
      { id: 'revenue-10', label: 'Выручка -10%', apply: (i: FinancialInputs) => applyRevenueShock(i, 10) },
      { id: 'revenue-20', label: 'Выручка -20%', apply: (i: FinancialInputs) => applyRevenueShock(i, 20) },
      { id: 'revenue-30', label: 'Выручка -30%', apply: (i: FinancialInputs) => applyRevenueShock(i, 30) },
      { id: 'costs-10', label: 'Постоянные расходы +10%', apply: (i: FinancialInputs) => applyFixedCostShock(i, 10) },
      { id: 'costs-20', label: 'Постоянные расходы +20%', apply: (i: FinancialInputs) => applyFixedCostShock(i, 20) },
      { id: 'cogs-10', label: 'Себестоимость +10%', apply: (i: FinancialInputs) => applyCogsShock(i, 10) },
      {
        id: 'client-loss',
        label: `Потеря крупнейшего клиента (-${clientLossPct}% выручки)`,
        apply: (i: FinancialInputs) => applyClientLossShock(i, clientLossPct),
      },
    ],
    [clientLossPct],
  )

  const results = useMemo(() => {
    if (!inputs) return []
    return scenarios.map(({ id, label, apply }) => {
      const snapshot = buildFinancialSnapshot(apply(inputs))
      const runwayMonths = calculateRunwayMonths(cashBalance, snapshot.cashFlow)
      const fundingNeeded = calculateFundingNeeded(cashBalance, snapshot.cashFlow, FUNDING_HORIZON_MONTHS)
      const survives = snapshot.netProfit >= 0 && snapshot.cashFlow >= 0
      return { id, label, snapshot, runwayMonths, fundingNeeded, survives }
    })
  }, [inputs, scenarios, cashBalance])

  if (!inputs) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Стресс-тест</h1>
        <p className="text-sm text-ink-500 mt-1">
          Как бизнес переживёт типовые негативные сценарии — при текущих постоянных расходах и остатке денег{' '}
          {formatCurrency(cashBalance)}.
        </p>
      </div>

      <Card className="p-5">
        <label className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-ink-300">Потеря крупнейшего клиента — % от выручки:</span>
          <Input
            type="number"
            min={1}
            max={100}
            value={clientLossPct}
            onChange={(e) => setClientLossPct(Math.min(100, Math.max(1, Number(e.target.value) || 0)))}
            className="w-24"
          />
        </label>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {results.map((r) => (
          <Card key={r.id} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{r.label}</CardTitle>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  r.survives
                    ? 'bg-positive-500/15 text-positive-500'
                    : 'bg-negative-500/15 text-negative-500'
                }`}
              >
                {r.survives ? 'Бизнес выдержит' : 'Критично'}
              </span>
            </CardHeader>
            <CardContent className="pt-2 grid grid-cols-2 gap-3">
              <Metric label="Чистая прибыль" value={formatCurrency(r.snapshot.netProfit)} accent={r.snapshot.netProfit >= 0} />
              <Metric label="Cash Flow / мес" value={formatCurrency(r.snapshot.cashFlow)} accent={r.snapshot.cashFlow >= 0} />
              <Metric label="Точка безубыточности" value={formatCurrency(r.snapshot.breakEvenRevenue)} />
              <Metric
                label="Запас прочности"
                value={formatPercent(r.snapshot.safetyMarginPct)}
                accent={r.snapshot.safetyMarginPct >= 0}
              />
              <Metric
                label="Запас хода"
                value={r.runwayMonths === null ? '— (не убывает)' : `${r.runwayMonths.toFixed(1)} мес.`}
                accent={r.runwayMonths === null}
              />
              <Metric
                label={`Нужно финансирования (${FUNDING_HORIZON_MONTHS} мес.)`}
                value={r.fundingNeeded > 0 ? formatCurrency(r.fundingNeeded) : '—'}
                accent={r.fundingNeeded === 0}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-ink-600">
        Запас хода и потребность в финансировании считаются от текущего остатка денег на конец периода в Cash Flow.
        Значение «—» в запасе хода значит, что при этом сценарии cash flow остаётся неотрицательным и деньги не заканчиваются.
      </p>
    </div>
  )
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-ink-800 px-3 py-2.5">
      <div className="text-xs text-ink-500 mb-1">{label}</div>
      <div className={`text-sm font-semibold ${accent === undefined ? 'text-ink-50' : accent ? 'text-positive-500' : 'text-negative-500'}`}>
        {value}
      </div>
    </div>
  )
}
