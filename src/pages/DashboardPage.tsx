import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Wallet } from 'lucide-react'
import { KpiCard } from '@/features/dashboard/KpiCard'
import { HealthIndicator } from '@/features/dashboard/HealthIndicator'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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

export function DashboardPage() {
  const { inputs, snapshot } = useFinancials()
  const diagnostics = useDiagnostics()
  const profile = useBusinessStore((s) => s.profile)
  const history = useBusinessStore((s) => s.history)

  if (!inputs || !snapshot || !diagnostics || !profile) return null

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50">Dashboard</h1>
        <p className="text-sm text-ink-500 mt-1">{profile?.name} · итоги за период {inputs.period}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Выручка"
          value={formatCurrency(snapshot.revenue)}
          tooltip="Все деньги, полученные от продаж товаров или услуг за период."
        />
        <KpiCard
          label="Чистая прибыль"
          value={formatCurrency(snapshot.netProfit)}
          tooltip="То, что остаётся после вычета всех расходов, налогов, процентов и амортизации."
          accent={snapshot.netProfit >= 0 ? 'positive' : 'negative'}
        />
        <KpiCard
          label="EBITDA"
          value={formatCurrency(snapshot.ebitda)}
          tooltip="Прибыль до вычета процентов, налогов и амортизации — показывает эффективность операционной деятельности."
          accent={snapshot.ebitda >= 0 ? 'positive' : 'negative'}
        />
        <KpiCard
          label="Маржинальность"
          value={formatPercent(snapshot.netMarginPct)}
          tooltip="Доля чистой прибыли в выручке. Показывает, сколько компания зарабатывает с каждого рубля продаж."
          accent={snapshot.netMarginPct >= 0 ? 'positive' : 'negative'}
        />
        <KpiCard
          label="Точка безубыточности"
          value={formatCurrency(snapshot.breakEvenRevenue)}
          tooltip="Минимальная выручка, при которой бизнес не уходит в убыток: постоянные расходы ÷ маржинальность."
        />
        <KpiCard
          label="Запас финансовой прочности"
          value={formatPercent(snapshot.safetyMarginPct)}
          tooltip="На сколько текущая выручка выше точки безубыточности. Чем выше — тем безопаснее бизнес."
          accent={snapshot.safetyMarginPct >= 20 ? 'positive' : snapshot.safetyMarginPct >= 0 ? 'neutral' : 'negative'}
        />
        <KpiCard
          label="Cash Flow"
          value={formatCurrency(snapshot.cashFlow)}
          tooltip="Разница между поступлениями и расходами денег за период."
          accent={snapshot.cashFlow >= 0 ? 'positive' : 'negative'}
          icon={<Wallet className="size-4 text-ink-500" />}
        />
        <KpiCard
          label="ROMI"
          value={formatPercent(snapshot.romiPct)}
          tooltip="Приблизительный возврат инвестиций в маркетинг: (выручка − расходы на рекламу) / расходы на рекламу. Оценка по всей выручке, так как продажи по рекламным каналам отдельно не учитываются."
          accent={snapshot.romiPct >= 0 ? 'positive' : 'negative'}
        />
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
        <KpiCard
          label="Выручка на сотрудника"
          value={revenuePerEmployee !== null ? formatCurrency(revenuePerEmployee) : '—'}
          tooltip="Выручка ÷ количество сотрудников. Индикатор эффективности штата — задайте число сотрудников в Настройках."
        />
        <KpiCard
          label="Стоимость продажи (оценка)"
          value={costPerSale !== null ? formatCurrency(costPerSale) : '—'}
          tooltip="Приблизительно: расходы на рекламу ÷ количество продаж. Не настоящий CAC — система не различает, какие продажи пришли именно из рекламы."
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <HealthIndicator diagnostics={diagnostics} />
        </div>

        <Card className="p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-3 text-warning-500">
            <AlertTriangle className="size-4" />
            <span className="text-sm font-medium">Что дальше</span>
          </div>
          <p className="text-sm text-ink-400 mb-4 flex-1">
            {diagnostics.problems.length > 0
              ? `Найдено проблем: ${diagnostics.problems.length}. Проведите полную диагностику, чтобы увидеть план действий.`
              : 'Явных проблем не найдено. Попробуйте смоделировать рост в симуляторе.'}
          </p>
          <Button asChild size="sm" variant="secondary" className="w-full justify-center">
            <Link to="/app/crisis">
              Открыть диагностику <ArrowRight className="size-4" />
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
