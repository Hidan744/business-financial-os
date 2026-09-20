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

export function DashboardPage() {
  const { inputs, snapshot } = useFinancials()
  const diagnostics = useDiagnostics()
  const profile = useBusinessStore((s) => s.profile)

  if (!inputs || !snapshot || !diagnostics) return null

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
