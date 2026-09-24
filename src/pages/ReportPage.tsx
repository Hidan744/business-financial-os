import { useMemo } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useFinancials } from '@/hooks/useFinancials'
import { useDiagnostics } from '@/hooks/useDiagnostics'
import { useBusinessStore } from '@/store/businessStore'
import { calculateScenario } from '@/lib/finance/scenario'
import { buildFinancialSnapshot } from '@/lib/finance/snapshot'
import { calculatePeriodGrowthPct } from '@/lib/finance/formulas'
import { buildExpenseBreakdown, buildHistoryTrend } from '@/lib/finance/reportCharts'
import { HEALTH_STATUS_LABELS } from '@/types/diagnostics'
import { formatCurrency, formatPercent, formatSigned } from '@/lib/utils'
import { CATEGORICAL } from '@/lib/chartColors'
import { ExpenseBreakdownBar } from '@/features/report/ExpenseBreakdownBar'
import { RevenueProfitTrendChart } from '@/features/report/RevenueProfitTrendChart'
import { MarginTrendChart } from '@/features/report/MarginTrendChart'
import { SparklineStatTile } from '@/features/report/SparklineStatTile'

export function ReportPage() {
  const { inputs, snapshot } = useFinancials()
  const diagnostics = useDiagnostics()
  const profile = useBusinessStore((s) => s.profile)
  const scenarios = useBusinessStore((s) => s.scenarios)
  const history = useBusinessStore((s) => s.history)

  const scenarioResults = useMemo(() => {
    if (!inputs) return []
    return scenarios.map((scenario) => ({
      scenario,
      snapshot: buildFinancialSnapshot(calculateScenario(inputs, scenario.multipliers)),
    }))
  }, [inputs, scenarios])

  const trend = useMemo(() => (inputs ? buildHistoryTrend(history, inputs) : []), [history, inputs])
  const expenseItems = useMemo(() => (inputs ? buildExpenseBreakdown(inputs) : []), [inputs])

  if (!inputs || !snapshot || !diagnostics || !profile) return null

  const generatedAt = new Date().toLocaleString('ru-RU')

  const previousPoint = trend.length >= 2 ? trend[trend.length - 2] : null
  const revenueGrowthPct = previousPoint ? calculatePeriodGrowthPct(snapshot.revenue, previousPoint.revenue) : null
  const profitGrowthPct = previousPoint ? calculatePeriodGrowthPct(snapshot.netProfit, previousPoint.netProfit) : null
  const cashFlowGrowthPct = previousPoint ? calculatePeriodGrowthPct(snapshot.cashFlow, previousPoint.cashFlow) : null

  return (
    <div className="space-y-6 max-w-3xl print:[&_*]:!bg-white print:[&_*]:!text-black print:[&_*]:!border-black/10">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-ink-50">Отчёт</h1>
          <p className="text-sm text-ink-500 mt-1">Финансовый отчёт для печати или сохранения в PDF.</p>
        </div>
        <Button onClick={() => window.print()}>
          <Download className="size-4" /> Скачать PDF
        </Button>
      </div>

      <div className="space-y-5 print:space-y-4">
        <div>
          <h2 className="text-xl font-semibold">{profile.name}</h2>
          <p className="text-sm text-ink-500">Финансовый отчёт · период {inputs.period} · сформирован {generatedAt}</p>
        </div>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink-200 mb-3">Финансовое состояние</h3>
          <p className="text-sm text-ink-300">
            Статус: <strong>{HEALTH_STATUS_LABELS[diagnostics.healthStatus]}</strong> (индекс {diagnostics.healthScore}/100)
          </p>
        </Card>

        <div className="grid sm:grid-cols-3 gap-3">
          <SparklineStatTile
            label="Выручка"
            value={formatCurrency(snapshot.revenue)}
            tooltip="Все деньги, полученные от продаж за период."
            deltaLabel={revenueGrowthPct !== null ? `${formatSigned(revenueGrowthPct, formatPercent)} к пред. периоду` : undefined}
            accent={revenueGrowthPct === null ? 'neutral' : revenueGrowthPct >= 0 ? 'positive' : 'negative'}
            sparkline={trend}
            sparklineKey="revenue"
            sparklineColor={CATEGORICAL.slot1}
          />
          <SparklineStatTile
            label="Чистая прибыль"
            value={formatCurrency(snapshot.netProfit)}
            tooltip="То, что остаётся после всех расходов, налогов, процентов и амортизации."
            deltaLabel={profitGrowthPct !== null ? `${formatSigned(profitGrowthPct, formatPercent)} к пред. периоду` : undefined}
            accent={snapshot.netProfit >= 0 ? 'positive' : 'negative'}
            sparkline={trend}
            sparklineKey="netProfit"
            sparklineColor={CATEGORICAL.slot3}
          />
          <SparklineStatTile
            label="Cash Flow"
            value={formatCurrency(snapshot.cashFlow)}
            tooltip="Разница между поступлениями и расходами денег за период."
            deltaLabel={cashFlowGrowthPct !== null ? `${formatSigned(cashFlowGrowthPct, formatPercent)} к пред. периоду` : undefined}
            accent={snapshot.cashFlow >= 0 ? 'positive' : 'negative'}
            sparkline={trend}
            sparklineKey="cashFlow"
            sparklineColor={CATEGORICAL.slot4}
          />
        </div>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink-200 mb-3">Ключевые показатели</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <ReportMetric label="Выручка" value={formatCurrency(snapshot.revenue)} />
            <ReportMetric label="Расходы" value={formatCurrency(snapshot.revenue - snapshot.netProfit)} />
            <ReportMetric label="Чистая прибыль" value={formatCurrency(snapshot.netProfit)} />
            <ReportMetric label="EBITDA" value={formatCurrency(snapshot.ebitda)} />
            <ReportMetric label="Cash Flow" value={formatCurrency(snapshot.cashFlow)} />
            <ReportMetric label="Точка безубыточности" value={formatCurrency(snapshot.breakEvenRevenue)} />
            <ReportMetric label="Запас прочности" value={formatPercent(snapshot.safetyMarginPct)} />
            <ReportMetric label="Маржинальность" value={formatPercent(snapshot.netMarginPct)} />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Структура расходов</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <ExpenseBreakdownBar items={expenseItems} />
          </CardContent>
        </Card>

        {trend.length >= 2 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Динамика выручки и прибыли</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueProfitTrendChart points={trend} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Динамика маржинальности</CardTitle>
              </CardHeader>
              <CardContent>
                <MarginTrendChart points={trend} />
              </CardContent>
            </Card>
          </>
        )}

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink-200 mb-3">Основные проблемы</h3>
          {diagnostics.problems.length === 0 ? (
            <p className="text-sm text-ink-400">Явных проблем не найдено.</p>
          ) : (
            <ol className="space-y-2 text-sm text-ink-300 list-decimal list-inside">
              {diagnostics.problems.map((p) => (
                <li key={p.id}>
                  <strong>{p.title}</strong> — {p.metricRef}: {p.value}
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink-200 mb-3">Сценарии</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {scenarioResults.map(({ scenario, snapshot: s }) => (
              <div key={scenario.id}>
                <div className="text-xs text-ink-500 mb-1">{scenario.name}</div>
                <div className="font-semibold">{formatCurrency(s.netProfit)}</div>
                <div className="text-xs text-ink-500">прибыль</div>
              </div>
            ))}
          </div>
        </Card>

        {diagnostics.actionPlan.length > 0 && (
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-200 mb-3">Рекомендации и план на 30 дней</h3>
            <div className="space-y-3 text-sm">
              {diagnostics.actionPlan.map((item) => (
                <div key={item.id}>
                  <div className="text-xs font-medium text-ink-500">{item.period}</div>
                  <div className="text-ink-200">{item.problem} → {item.action}</div>
                  <div className="text-xs text-ink-500">Эффект: {item.expectedEffect}. Контроль: {item.controlMetric}.</div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-ink-500">{label}</div>
      <div className="font-semibold text-ink-50">{value}</div>
    </div>
  )
}
