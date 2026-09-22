import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Wallet } from 'lucide-react'
import { KpiCard } from '@/features/dashboard/KpiCard'
import { HealthIndicator } from '@/features/dashboard/HealthIndicator'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InfoTooltip } from '@/components/ui/tooltip'
import { useFinancials } from '@/hooks/useFinancials'
import { useDiagnostics } from '@/hooks/useDiagnostics'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { useBusinessStore } from '@/store/businessStore'
import {
  calculateApproxCostPerSale,
  calculatePeriodGrowthPct,
  calculateRevenuePerEmployee,
} from '@/lib/finance/formulas'
import { buildFinancialSnapshot } from '@/lib/finance/snapshot'
import { buildCashFlowSummary } from '@/lib/finance/cashflow'
import { calculateRunwayMonths } from '@/lib/finance/stressTest'
import { calculateForecast, findCashFlowGap } from '@/lib/finance/forecast'
import { BUSINESS_TYPE_KPI_PRIORITIES } from '@/lib/businessTypeKpis'

export function DashboardPage() {
  const { inputs, snapshot } = useFinancials()
  const diagnostics = useDiagnostics()
  const profile = useBusinessStore((s) => s.profile)
  const history = useBusinessStore((s) => s.history)
  const cashFlowInputs = useBusinessStore((s) => s.cashFlowInputs)
  const balanceSheet = useBusinessStore((s) => s.balanceSheet)
  const forecastConfig = useBusinessStore((s) => s.forecastConfig)

  if (!inputs || !snapshot || !diagnostics || !profile) return null

  const cashBalance = cashFlowInputs ? buildCashFlowSummary(cashFlowInputs).closingBalance : 0
  const forecastPoints = calculateForecast(inputs, forecastConfig, {
    currentEmployeesCount: profile.employeesCount,
    openingCash: balanceSheet?.currentAssets.cash ?? 0,
  })
  const cashFlowGap = findCashFlowGap(forecastPoints)
  const healthHeadline = {
    cashFlow: snapshot.cashFlow,
    safetyMarginPct: snapshot.safetyMarginPct,
    runwayMonths: calculateRunwayMonths(cashBalance, snapshot.cashFlow),
    dscr: snapshot.dscr,
    debtToEbitda: snapshot.debtToEbitda,
  }

  const revenuePerEmployee = calculateRevenuePerEmployee(snapshot.revenue, profile.employeesCount)
  const costPerSale = calculateApproxCostPerSale(inputs.marketing, inputs.salesCount)
  const previousPeriod = [...history].sort((a, b) => b.period.localeCompare(a.period))[0]
  const previousSnapshot = previousPeriod ? buildFinancialSnapshot(previousPeriod) : null
  const revenueGrowthPct = previousSnapshot ? calculatePeriodGrowthPct(snapshot.revenue, previousSnapshot.revenue) : null
  const profitGrowthPct = previousSnapshot ? calculatePeriodGrowthPct(snapshot.netProfit, previousSnapshot.netProfit) : null

  const yoyPeriod = getPeriodOneYearAgo(inputs.period)
  const yoyRecord = history.find((h) => h.period === yoyPeriod)
  const yoySnapshot = yoyRecord ? buildFinancialSnapshot(yoyRecord) : null
  const revenueYoyPct = yoySnapshot ? calculatePeriodGrowthPct(snapshot.revenue, yoySnapshot.revenue) : null
  const profitYoyPct = yoySnapshot ? calculatePeriodGrowthPct(snapshot.netProfit, yoySnapshot.netProfit) : null

  const priorityKeys = BUSINESS_TYPE_KPI_PRIORITIES[profile.type] ?? []
  const isKey = (key: string) => priorityKeys.includes(key)

  const isSelfEmployed = profile.isSelfEmployed ?? false
  const selfEmployedExpenses = snapshot.revenue - snapshot.netProfit - inputs.taxes

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Dashboard</h1>
        <p className="text-sm text-ink-500 mt-1">{profile?.name} · итоги за период {inputs.period}</p>
      </div>

      {cashFlowGap && (
        <Card className="p-4 border-negative-500/30 bg-negative-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-negative-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-sm font-medium text-negative-500">
                Риск кассового разрыва через {cashFlowGap.monthIndex + 1} мес. ({cashFlowGap.period})
                <InfoTooltip>
                  По прогнозу на 12 месяцев (текущие настройки роста, сезонности и остаток денег из
                  Баланса) остаток денег уходит в минус — деньги закончатся, если ничего не изменить.
                  Это предупреждение по текущим трендам, а не гарантия: не учитывает рост оборотного
                  капитала при масштабировании и зависит от точности настроек прогноза.
                </InfoTooltip>
              </div>
              <p className="text-sm text-ink-300 mt-1">
                Не хватит примерно {formatCurrency(cashFlowGap.shortfall)}. Проверьте настройки в «Прогнозе» —
                рост расходов, снижение выручки или сезонность могут этому способствовать.
              </p>
            </div>
            <Button asChild size="sm" variant="secondary" className="shrink-0">
              <Link to="/app/forecast">
                Открыть прогноз <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {isSelfEmployed && (
        <Card className="p-5">
          <div className="text-xs font-medium text-ink-400 mb-3">Доход − Расходы − Налог = Чистый доход</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
            <SelfEmployedMetric label="Доход" value={snapshot.revenue} />
            <SelfEmployedMetric label="Расходы" value={selfEmployedExpenses} sign="-" />
            <SelfEmployedMetric label="Налог" value={inputs.taxes} sign="-" />
            <SelfEmployedMetric label="Чистый доход" value={snapshot.netProfit} sign="=" bold />
          </div>
          <SelfEmployedHoursCalculator netProfit={snapshot.netProfit} />
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Выручка"
          value={formatCurrency(snapshot.revenue)}
          tooltip="Все деньги, полученные от продаж товаров или услуг за период."
          highlighted={isKey('revenue')}
        />
        <KpiCard
          label="Чистая прибыль"
          value={formatCurrency(snapshot.netProfit)}
          tooltip="То, что остаётся после вычета всех расходов, налогов, процентов и амортизации."
          accent={snapshot.netProfit >= 0 ? 'positive' : 'negative'}
          highlighted={isKey('netProfit')}
        />
        <KpiCard
          label="EBITDA"
          value={formatCurrency(snapshot.ebitda)}
          tooltip="Прибыль до вычета процентов, налогов и амортизации — показывает эффективность операционной деятельности."
          accent={snapshot.ebitda >= 0 ? 'positive' : 'negative'}
          highlighted={isKey('ebitda')}
        />
        <KpiCard
          label="Маржинальность"
          value={formatPercent(snapshot.netMarginPct)}
          tooltip="Доля чистой прибыли в выручке. Показывает, сколько компания зарабатывает с каждого рубля продаж."
          accent={snapshot.netMarginPct >= 0 ? 'positive' : 'negative'}
          highlighted={isKey('netMarginPct')}
        />
        <KpiCard
          label="Валовая маржа"
          value={formatPercent(snapshot.grossMarginPct)}
          tooltip="(Выручка − Себестоимость) / Выручка. Сколько остаётся после прямых затрат на товар/услугу."
          accent={snapshot.grossMarginPct >= 0 ? 'positive' : 'negative'}
          highlighted={isKey('grossMarginPct')}
        />
        <KpiCard
          label="EBITDA маржа"
          value={formatPercent(snapshot.ebitdaMarginPct)}
          tooltip="EBITDA / Выручка. Операционная эффективность без учёта амортизации, процентов и налогов."
          accent={snapshot.ebitdaMarginPct >= 0 ? 'positive' : 'negative'}
          highlighted={isKey('ebitdaMarginPct')}
        />
        <KpiCard
          label="Точка безубыточности"
          value={formatCurrency(snapshot.breakEvenRevenue)}
          tooltip="Минимальная выручка, при которой бизнес не уходит в убыток: постоянные расходы ÷ маржинальность."
          highlighted={isKey('breakEvenRevenue')}
        />
        <KpiCard
          label="Запас финансовой прочности"
          value={formatPercent(snapshot.safetyMarginPct)}
          tooltip="На сколько текущая выручка выше точки безубыточности. Чем выше — тем безопаснее бизнес."
          accent={snapshot.safetyMarginPct >= 20 ? 'positive' : snapshot.safetyMarginPct >= 0 ? 'neutral' : 'negative'}
          highlighted={isKey('safetyMarginPct')}
        />
        <KpiCard
          label="Cash Flow"
          value={formatCurrency(snapshot.cashFlow)}
          tooltip="Разница между поступлениями и расходами денег за период."
          accent={snapshot.cashFlow >= 0 ? 'positive' : 'negative'}
          icon={<Wallet className="size-4 text-ink-500" />}
          highlighted={isKey('cashFlow')}
        />
        <KpiCard
          label="Marketing Efficiency"
          value={formatPercent(snapshot.marketingEfficiencyPct)}
          tooltip="НЕ настоящий ROMI. Грубая оценка (вся выручка − расходы на рекламу) / расходы на рекламу, по всей выручке компании — система не различает, какие продажи пришли именно из рекламы. Чтобы увидеть настоящий ROMI, укажите выручку, атрибутированную маркетингу, в разделе «Финансы»."
          accent={snapshot.marketingEfficiencyPct >= 0 ? 'positive' : 'negative'}
          highlighted={isKey('marketingEfficiencyPct')}
        />
        {snapshot.romiPct !== null && (
          <KpiCard
            label="ROMI"
            value={formatPercent(snapshot.romiPct)}
            tooltip="Настоящий ROMI: (атрибутированная маркетингу выручка × валовая маржа − расходы на маркетинг) / расходы на маркетинг."
            accent={snapshot.romiPct >= 0 ? 'positive' : 'negative'}
            highlighted={isKey('romiPct')}
          />
        )}
        {snapshot.debtToEbitda !== null && (
          <KpiCard
            label="Долг / EBITDA"
            value={`${snapshot.debtToEbitda.toFixed(2)}×`}
            tooltip="Остаток долга (кратко- + долгосрочный, из раздела «Баланс») к годовой EBITDA. Меньше 3× обычно считается безопасным уровнем. «—», если в балансе не указан остаток долга."
            accent={snapshot.debtToEbitda <= 3 ? 'positive' : 'negative'}
            highlighted={isKey('debtToEbitda')}
          />
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {revenueGrowthPct !== null && (
          <KpiCard
            label="Рост выручки"
            value={formatPercent(revenueGrowthPct)}
            tooltip="Изменение выручки к предыдущему закрытому периоду. Появляется после закрытия хотя бы одного периода в разделе «История»."
            accent={revenueGrowthPct >= 0 ? 'positive' : 'negative'}
          />
        )}
        {profitGrowthPct !== null && (
          <KpiCard
            label="Рост чистой прибыли"
            value={formatPercent(profitGrowthPct)}
            tooltip="Изменение чистой прибыли к предыдущему закрытому периоду."
            accent={profitGrowthPct >= 0 ? 'positive' : 'negative'}
          />
        )}
        {revenueYoyPct !== null && (
          <KpiCard
            label="Рост выручки г/г"
            value={formatPercent(revenueYoyPct)}
            tooltip={`Изменение выручки по сравнению с тем же месяцем год назад (${yoyPeriod}). Появляется, когда в «Истории» закрыт период 12 месяцев назад.`}
            accent={revenueYoyPct >= 0 ? 'positive' : 'negative'}
          />
        )}
        {profitYoyPct !== null && (
          <KpiCard
            label="Рост прибыли г/г"
            value={formatPercent(profitYoyPct)}
            tooltip={`Изменение чистой прибыли по сравнению с тем же месяцем год назад (${yoyPeriod}).`}
            accent={profitYoyPct >= 0 ? 'positive' : 'negative'}
          />
        )}
        {!isSelfEmployed && (
          <KpiCard
            label="Выручка на сотрудника"
            value={revenuePerEmployee !== null ? formatCurrency(revenuePerEmployee) : '—'}
            tooltip="Выручка ÷ количество сотрудников. Индикатор эффективности штата — задайте число сотрудников в Настройках."
            highlighted={isKey('revenuePerEmployee')}
          />
        )}
        <KpiCard
          label="Стоимость продажи (оценка)"
          value={costPerSale !== null ? formatCurrency(costPerSale) : '—'}
          tooltip="Приблизительно: расходы на рекламу ÷ количество продаж. Не настоящий CAC — система не различает, какие продажи пришли именно из рекламы."
          highlighted={isKey('costPerSale')}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <HealthIndicator diagnostics={diagnostics} headline={healthHeadline} />
        </div>

        <Card className="p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-3 text-warning-500">
            <AlertTriangle className="size-4" />
            <span className="text-sm font-medium">Что делать сейчас</span>
          </div>
          {diagnostics.actionPlan.length > 0 ? (
            <ol className="space-y-3 text-sm mb-4 flex-1">
              {diagnostics.actionPlan.slice(0, 3).map((item, i) => (
                <li key={item.id} className="flex gap-2">
                  <span className="text-ink-600 font-medium shrink-0">{i + 1}.</span>
                  <span className="text-ink-300">{item.action}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink-400 mb-4 flex-1">Явных проблем не найдено. Попробуйте смоделировать рост в симуляторе.</p>
          )}
          <Button asChild size="sm" variant="secondary" className="w-full justify-center">
            <Link to="/app/crisis">
              Открыть полный план <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  )
}

/** Период того же месяца год назад, напр. '2026-09' → '2025-09'. */
function getPeriodOneYearAgo(period: string): string {
  const [year, month] = period.split('-')
  return `${Number(year) - 1}-${month}`
}

function SelfEmployedMetric({ label, value, sign, bold }: { label: string; value: number; sign?: '-' | '='; bold?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {sign && <span className="text-ink-500 text-sm">{sign}</span>}
      <div>
        <div className="text-xs text-ink-500">{label}</div>
        <div className={`tabular-nums ${bold ? 'text-lg font-semibold text-ink-50' : 'text-sm text-ink-200'}`}>{formatCurrency(value)}</div>
      </div>
    </div>
  )
}

/**
 * "Сколько нужно работать, чтобы получать X чистыми?" — простой обратный расчёт от текущего
 * дохода в час. Часы за месяц — локальный, непостоянный ввод (что-если калькулятор, не факт).
 */
function SelfEmployedHoursCalculator({ netProfit }: { netProfit: number }) {
  const [hoursPerMonth, setHoursPerMonth] = useState(160)
  const [targetNetInput, setTargetNetInput] = useState('300000')

  const targetNet = Number(targetNetInput.replace(/\s/g, '').replace(',', '.')) || 0
  const netPerHour = hoursPerMonth > 0 ? netProfit / hoursPerMonth : null
  const requiredHours = netPerHour !== null && netPerHour > 0 ? targetNet / netPerHour : null

  return (
    <div className="mt-4 pt-4 border-t border-ink-800 grid sm:grid-cols-3 gap-4 items-end">
      <div>
        <Label htmlFor="hours-per-month" className="text-xs">Рабочих часов в месяц сейчас</Label>
        <Input
          id="hours-per-month"
          inputMode="decimal"
          value={hoursPerMonth}
          onChange={(e) => setHoursPerMonth(Math.max(0, Number(e.target.value) || 0))}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="target-net" className="text-xs">Хочу получать чистыми, ₽/мес</Label>
        <Input id="target-net" inputMode="decimal" value={targetNetInput} onChange={(e) => setTargetNetInput(e.target.value)} className="mt-1.5" />
      </div>
      <div>
        <div className="text-xs text-ink-500 mb-1">
          {netPerHour !== null ? `Сейчас: ${formatCurrency(netPerHour)}/час` : 'Укажите часы'}
        </div>
        <div className="text-sm font-semibold text-ink-50">
          {requiredHours !== null
            ? `≈ ${Math.round(requiredHours)} ч/мес нужно`
            : netPerHour !== null && netPerHour <= 0
              ? 'При текущем доходе/час цель недостижима без изменения ставки'
              : '—'}
        </div>
      </div>
    </div>
  )
}
