import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/tooltip'
import { ParamSlider } from '@/features/simulator/ParamSlider'
import { ForecastChart } from '@/features/forecast/ForecastChart'
import { useFinancials } from '@/hooks/useFinancials'
import { useBusinessStore } from '@/store/businessStore'
import { calculateForecast } from '@/lib/finance/forecast'
import { formatCurrency } from '@/lib/utils'

export function ForecastPage() {
  const { inputs } = useFinancials()
  const profile = useBusinessStore((s) => s.profile)
  const balanceSheet = useBusinessStore((s) => s.balanceSheet)
  const forecastConfig = useBusinessStore((s) => s.forecastConfig)
  const setForecastConfig = useBusinessStore((s) => s.setForecastConfig)

  const openingCash = balanceSheet?.currentAssets.cash ?? 0

  const points = useMemo(() => {
    if (!inputs) return []
    return calculateForecast(inputs, forecastConfig, { currentEmployeesCount: profile?.employeesCount ?? 1, openingCash })
  }, [inputs, forecastConfig, profile, openingCash])

  if (!inputs) return null

  const totalRevenue = points.reduce((s, p) => s + p.revenue, 0)
  const totalProfit = points.reduce((s, p) => s + p.netProfit, 0)
  const netCashFlow12mo = points.reduce((s, p) => s + p.cashFlow, 0)
  const endingCashBalance = points.length > 0 ? points[points.length - 1].cashBalance : openingCash

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Прогноз на 12 месяцев</h1>
        <p className="text-sm text-ink-500 mt-1">Спроецируйте текущие показатели вперёд и настройте допущения.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-ink-400 mb-1">Выручка за 12 мес.</div>
          <div className="text-lg font-semibold text-ink-50">{formatCurrency(totalRevenue)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-ink-400 mb-1">Прибыль за 12 мес.</div>
          <div className={`text-lg font-semibold ${totalProfit >= 0 ? 'text-positive-500' : 'text-negative-500'}`}>
            {formatCurrency(totalProfit)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-ink-400 mb-1">Чистый Cash Flow за 12 мес.</div>
          <div className={`text-lg font-semibold ${netCashFlow12mo >= 0 ? 'text-positive-500' : 'text-negative-500'}`}>
            {formatCurrency(netCashFlow12mo)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-ink-400 mb-1 flex items-center gap-1">
            Остаток денег через 12 мес.
            <InfoTooltip>
              Остаток на начало ({formatCurrency(openingCash)}, из раздела «Баланс») + накопленный чистый денежный
              поток за 12 месяцев. Это фактический прогнозный остаток, а не просто сумма месячных cash flow.
            </InfoTooltip>
          </div>
          <div className={`text-lg font-semibold ${endingCashBalance >= 0 ? 'text-positive-500' : 'text-negative-500'}`}>
            {formatCurrency(endingCashBalance)}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Допущения</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-5">
            <ParamSlider
              label="Рост количества продаж, %/мес"
              value={forecastConfig.salesCountGrowthPct}
              min={-10}
              max={15}
              onChange={(v) => setForecastConfig({ ...forecastConfig, salesCountGrowthPct: v })}
            />
            <ParamSlider
              label="Рост среднего чека, %/мес"
              value={forecastConfig.avgCheckGrowthPct}
              min={-5}
              max={10}
              onChange={(v) => setForecastConfig({ ...forecastConfig, avgCheckGrowthPct: v })}
            />
            <ParamSlider
              label="Динамика рекламного бюджета, %/мес"
              value={forecastConfig.marketingBudgetTrendPct}
              min={-10}
              max={20}
              onChange={(v) => setForecastConfig({ ...forecastConfig, marketingBudgetTrendPct: v })}
            />
            <ParamSlider
              label="Доп. сотрудников за 12 мес"
              value={forecastConfig.employeesGrowth}
              min={0}
              max={10}
              step={1}
              onChange={(v) => setForecastConfig({ ...forecastConfig, employeesGrowth: v })}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              Выручка, расходы, прибыль и остаток денег
              <InfoTooltip>
                «Рост продаж» и «Рост среднего чека» — независимые допущения. Их совместный эффект на выручку —
                произведение, а не сумма: например, +5% продаж и +3% к чеку в месяц дают вместе ≈ +8.15% выручки в
                месяц, а не +5%.
              </InfoTooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ForecastChart points={points} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
