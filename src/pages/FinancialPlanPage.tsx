import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InfoTooltip } from '@/components/ui/tooltip'
import { useFinancials } from '@/hooks/useFinancials'
import { useBusinessStore } from '@/store/businessStore'
import { buildFinancialPlan } from '@/lib/finance/financialPlan'
import { formatCurrency } from '@/lib/utils'

const HORIZON_OPTIONS = [6, 12, 18, 24]

export function FinancialPlanPage() {
  const navigate = useNavigate()
  const { inputs } = useFinancials()
  const profile = useBusinessStore((s) => s.profile)
  const setForecastConfig = useBusinessStore((s) => s.setForecastConfig)
  const forecastConfig = useBusinessStore((s) => s.forecastConfig)
  const taxSettings = useBusinessStore((s) => s.taxSettings)
  const balanceSheet = useBusinessStore((s) => s.balanceSheet)

  const [targetInput, setTargetInput] = useState('6000000')
  const [monthsToTarget, setMonthsToTarget] = useState(12)

  const target = Number(targetInput.replace(/\s/g, '').replace(',', '.')) || 0

  const plan = useMemo(() => {
    if (!inputs) return null
    return buildFinancialPlan(inputs, target, monthsToTarget, profile?.employeesCount ?? 1, taxSettings, balanceSheet ?? undefined)
  }, [inputs, target, monthsToTarget, profile, taxSettings, balanceSheet])

  if (!inputs || !plan) return null

  function applyGrowthRateToForecast() {
    if (plan!.requiredMonthlyGrowthRatePct === null) return
    const rate = plan!.alreadyAchieved ? 0 : Math.round(plan!.requiredMonthlyGrowthRatePct * 10) / 10
    setForecastConfig({ ...forecastConfig, salesCountGrowthPct: rate })
    navigate('/app/forecast')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50 flex items-center gap-2">
          <Target className="size-5 text-brand-400" />
          Финансовый план
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          Задайте цель по чистой прибыли — система посчитает, сколько для этого нужно выручки и продаж, и построит план по месяцам и кварталам.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Цель</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target-profit">Целевая чистая прибыль за период, ₽</Label>
              <Input
                id="target-profit"
                inputMode="decimal"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="months-to-target">Срок, месяцев</Label>
              <select
                id="months-to-target"
                value={monthsToTarget}
                onChange={(e) => setMonthsToTarget(Number(e.target.value))}
                className="mt-2 w-full h-10 rounded-lg border border-ink-800 bg-ink-900 px-3 text-sm text-ink-100"
              >
                {HORIZON_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} мес.
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-ink-500">
            Расчёт исходит из текущей маржинальности и структуры затрат — если они изменятся (новая цена, другие
            расходы), пересчитайте план заново.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Что для этого нужно
            <InfoTooltip>
              Цель — это ЧИСТАЯ прибыль (после амортизации, процентов по кредиту и налога), поэтому нужная
              выручка находится подбором: система прогоняет разные значения выручки через P&amp;L и налоговый
              движок (тот же, что на странице «Налоги»), пока чистая прибыль не сойдётся к цели. Если
              маржинальность сейчас ≤ 0 — цель недостижима только за счёт роста продаж, сначала нужно исправить
              экономику (цену, себестоимость).
            </InfoTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {plan.requiredMonthlyRevenue === null ? (
            <p className="text-sm text-negative-500 py-4 text-center">
              При текущей марже (выручка не покрывает даже переменные затраты) эта цель недостижима через рост
              продаж — сначала нужно повысить маржинальность.
            </p>
          ) : (
            <div className="space-y-4">
              {plan.alreadyAchieved && (
                <div className="rounded-xl border border-positive-500/30 bg-positive-500/10 px-4 py-3 text-sm text-positive-500">
                  Текущих показателей уже достаточно для этой цели — дополнительный рост не требуется.
                </div>
              )}
              <div className="grid sm:grid-cols-3 gap-3">
                <ResultTile label="Нужная выручка в месяц" value={formatCurrency(plan.requiredMonthlyRevenue)} />
                <ResultTile
                  label="Нужно продаж в месяц"
                  value={plan.requiredMonthlySales !== null ? Math.round(plan.requiredMonthlySales).toLocaleString('ru-RU') : '—'}
                />
                <ResultTile
                  label="Нужный темп роста"
                  value={
                    plan.requiredMonthlyGrowthRatePct !== null
                      ? `${plan.alreadyAchieved ? 0 : plan.requiredMonthlyGrowthRatePct >= 0 ? '+' : ''}${(plan.alreadyAchieved ? 0 : plan.requiredMonthlyGrowthRatePct).toFixed(1)}%/мес`
                      : '—'
                  }
                />
              </div>
              <Button size="sm" variant="secondary" onClick={applyGrowthRateToForecast}>
                Открыть в разделе «Прогноз» с этим темпом
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {plan.quarters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>План по кварталам</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-500 border-b border-ink-800">
                    <th className="py-2 pr-4 font-medium">Квартал</th>
                    <th className="py-2 pr-4 font-medium text-right">Выручка</th>
                    <th className="py-2 pr-4 font-medium text-right">Чистая прибыль</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.quarters.map((q) => (
                    <tr key={q.quarter} className="border-b border-ink-800/60">
                      <td className="py-2 pr-4 text-ink-300">Q{q.quarter}</td>
                      <td className="py-2 pr-4 text-right text-ink-100 tabular-nums">{formatCurrency(q.revenue)}</td>
                      <td
                        className={`py-2 pr-4 text-right tabular-nums ${q.netProfit >= 0 ? 'text-positive-500' : 'text-negative-500'}`}
                      >
                        {formatCurrency(q.netProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-ink-500 mt-3">
              План строится через рост количества продаж (та же модель, что в разделе «Прогноз»). Средний чек,
              реклама и штат считаются неизменными — при желании настройте разные драйверы отдельно на странице
              «Прогноз».
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ResultTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-800 px-4 py-3">
      <div className="text-xs text-ink-400 mb-1">{label}</div>
      <div className="text-lg font-semibold text-ink-50">{value}</div>
    </div>
  )
}
