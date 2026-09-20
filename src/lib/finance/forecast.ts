import type { FinancialInputs } from '@/types/finance'
import type { ForecastConfig, MonthlyForecastPoint } from '@/types/scenario'
import { buildFinancialSnapshot, getFixedCosts } from './snapshot'

const MONTH_LABELS = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
]

export interface ForecastOptions {
  months?: number
  startMonthIndex?: number
  /** Текущее число сотрудников — нужно, чтобы распределить рост ФОТ на доп. штат равномерно. */
  currentEmployeesCount?: number
}

export function calculateForecast(
  base: FinancialInputs,
  config: ForecastConfig,
  options: ForecastOptions = {},
): MonthlyForecastPoint[] {
  const months = options.months ?? 12
  const startMonthIndex = options.startMonthIndex ?? new Date().getMonth()
  const currentEmployeesCount = Math.max(1, options.currentEmployeesCount ?? 1)

  const points: MonthlyForecastPoint[] = []
  const growthRate = config.monthlyGrowthRatePct / 100
  const marketingTrend = config.marketingBudgetTrendPct / 100
  const checkGrowth = config.avgCheckGrowthPct / 100
  const costPerEmployee = base.payroll / currentEmployeesCount
  const cogsRatio = base.revenue > 0 ? base.cogs / base.revenue : 0

  for (let i = 0; i < months; i++) {
    const seasonIdx = (startMonthIndex + i) % 12
    const seasonality = config.seasonality[seasonIdx] ?? 1
    const growthFactor = Math.pow(1 + growthRate, i + 1)
    const avgCheck = base.avgCheck * Math.pow(1 + checkGrowth, i + 1)
    const salesCount = base.salesCount * growthFactor * seasonality
    const revenue = avgCheck * salesCount

    const marketing = Math.max(0, base.marketing * Math.pow(1 + marketingTrend, i + 1))
    const additionalEmployees = config.employeesGrowth * ((i + 1) / months)
    const payroll = base.payroll + additionalEmployees * costPerEmployee

    const inputs: FinancialInputs = {
      ...base,
      revenue,
      avgCheck,
      salesCount,
      marketing,
      cogs: cogsRatio * revenue,
      payroll,
    }

    const snapshot = buildFinancialSnapshot(inputs)
    const fixedCosts = getFixedCosts(inputs)
    const expenses = inputs.cogs + fixedCosts + inputs.taxes + inputs.loanInterest

    points.push({
      monthIndex: i,
      label: MONTH_LABELS[seasonIdx],
      revenue,
      expenses,
      netProfit: snapshot.netProfit,
      cashFlow: snapshot.cashFlow,
    })
  }

  return points
}
