import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InfoTooltip } from '@/components/ui/tooltip'
import { ParamSlider } from '@/features/simulator/ParamSlider'
import { ForecastChart } from '@/features/forecast/ForecastChart'
import { useFinancials } from '@/hooks/useFinancials'
import { useBusinessStore } from '@/store/businessStore'
import { calculateForecast } from '@/lib/finance/forecast'
import { calculateIncrementalWorkingCapital, calculateWorkingCapitalMetrics } from '@/lib/finance/balanceSheet'
import { formatCurrency } from '@/lib/utils'

export function ForecastPage() {
  const { inputs } = useFinancials()
  const profile = useBusinessStore((s) => s.profile)
  const balanceSheet = useBusinessStore((s) => s.balanceSheet)
  const forecastConfig = useBusinessStore((s) => s.forecastConfig)
  const setForecastConfig = useBusinessStore((s) => s.setForecastConfig)
  const taxSettings = useBusinessStore((s) => s.taxSettings)

  const openingCash = balanceSheet?.currentAssets.cash ?? 0

  const points = useMemo(() => {
    if (!inputs) return []
    return calculateForecast(inputs, forecastConfig, {
      currentEmployeesCount: profile?.employeesCount ?? 1,
      openingCash,
      taxSettings,
      balanceSheet: balanceSheet ?? undefined,
    })
  }, [inputs, forecastConfig, profile, openingCash, taxSettings, balanceSheet])

  if (!inputs) return null

  const totalRevenue = points.reduce((s, p) => s + p.revenue, 0)
  const totalProfit = points.reduce((s, p) => s + p.netProfit, 0)
  const netCashFlow12mo = points.reduce((s, p) => s + p.cashFlow, 0)
  const endingCashBalance = points.length > 0 ? points[points.length - 1].cashBalance : openingCash

  // Сколько доп. оборотного капитала потребует рост выручки до конца прогноза, при текущей
  // оборачиваемости (DSO/DIO/DPO) — деньги, замороженные в дебиторке и запасах, растут вместе
  // с бизнесом, и это не то же самое, что прибыль.
  const cogsRatio = inputs.revenue > 0 ? inputs.cogs / inputs.revenue : 0
  const lastPoint = points.length > 0 ? points[points.length - 1] : null
  const projectedCogs = lastPoint ? lastPoint.revenue * cogsRatio : inputs.cogs
  const workingCapitalMetrics = balanceSheet
    ? calculateWorkingCapitalMetrics(
        balanceSheet.currentAssets.receivables,
        balanceSheet.currentLiabilities.payables,
        balanceSheet.currentAssets.inventory,
        inputs.revenue,
        inputs.cogs,
      )
    : null
  const incrementalWorkingCapital =
    lastPoint && workingCapitalMetrics
      ? calculateIncrementalWorkingCapital(inputs.revenue, inputs.cogs, lastPoint.revenue, projectedCogs, workingCapitalMetrics)
      : null

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
            {balanceSheet && (
              <div>
                <Label htmlFor="monthly-capex" className="flex items-center gap-1.5">
                  CAPEX в месяц, ₽
                  <InfoTooltip>
                    Покупка/ремонт оборудования и т.п. — постоянная сумма на весь горизонт прогноза. Уменьшает
                    остаток денег каждый месяц и увеличивает основные средства в прогнозном балансе ниже, но не
                    влияет на чистую прибыль напрямую — только амортизация (отдельное допущение) её снижает.
                  </InfoTooltip>
                </Label>
                <Input
                  id="monthly-capex"
                  inputMode="decimal"
                  placeholder="0"
                  value={forecastConfig.monthlyCapex || ''}
                  onChange={(e) => {
                    const parsed = Number(e.target.value.replace(/\s/g, '').replace(',', '.'))
                    setForecastConfig({ ...forecastConfig, monthlyCapex: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0 })
                  }}
                  className="mt-2"
                />
              </div>
            )}
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

      {incrementalWorkingCapital !== null && (
        <Card className="p-5">
          <div className="flex items-center gap-1.5 text-xs text-ink-400 mb-1">
            Доп. оборотный капитал на рост до конца прогноза
            <InfoTooltip>
              При росте выручки с {formatCurrency(inputs.revenue)} до {lastPoint ? formatCurrency(lastPoint.revenue) : '—'}
              {' '}деньги замораживаются в дебиторке и запасах (частично компенсируется ростом кредиторки) — при
              текущей оборачиваемости (DSO/DIO/DPO из раздела «Баланс»). Это не расход и не убыток, но это деньги,
              которые бизнес не сможет вывести — рост «съедает» кэш, даже если прибыльный.
            </InfoTooltip>
          </div>
          <div className={`text-lg font-semibold ${incrementalWorkingCapital <= 0 ? 'text-positive-500' : 'text-warning-500'}`}>
            {incrementalWorkingCapital > 0 ? '+' : ''}
            {formatCurrency(incrementalWorkingCapital)}
          </div>
          {incrementalWorkingCapital <= 0 && (
            <p className="text-xs text-ink-500 mt-1">Рост выручки не увеличивает потребность в оборотном капитале — кредиторка растёт быстрее дебиторки/запасов.</p>
          )}
        </Card>
      )}

      {lastPoint?.balanceSheet && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              Прогнозный баланс через 12 мес.
              <InfoTooltip>
                Основные средства катятся вперёд как CAPEX минус амортизация, долг — минус платежи по телу
                кредита (из «Финансов»), капитал — как накопленная чистая прибыль. Проверка: Активы должны
                сходиться с Обязательства + Капитал — если нет, где-то разошлись входные данные.
              </InfoTooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ForecastBalanceTile label="Основные средства" value={formatCurrency(lastPoint.balanceSheet.fixedAssets)} />
              <ForecastBalanceTile label="Остаток долга" value={formatCurrency(lastPoint.balanceSheet.debtBalance)} />
              <ForecastBalanceTile label="Капитал" value={formatCurrency(lastPoint.balanceSheet.equity)} />
              <ForecastBalanceTile
                label="Баланс сходится?"
                value={Math.abs(lastPoint.balanceSheet.identityGap) < 1 ? 'Да' : `Расхождение ${formatCurrency(lastPoint.balanceSheet.identityGap)}`}
                accent={Math.abs(lastPoint.balanceSheet.identityGap) < 1 ? 'positive' : 'negative'}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ForecastBalanceTile({ label, value, accent }: { label: string; value: string; accent?: 'positive' | 'negative' }) {
  const color = accent === 'positive' ? 'text-positive-500' : accent === 'negative' ? 'text-negative-500' : 'text-ink-50'
  return (
    <div className="rounded-xl border border-ink-800 px-4 py-3">
      <div className="text-xs text-ink-400 mb-1">{label}</div>
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
    </div>
  )
}
