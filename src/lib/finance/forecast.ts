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
  /** Остаток денег на начало прогноза (из Баланса, currentAssets.cash). По умолчанию 0. */
  openingCash?: number
}

/**
 * Средний темп роста выручки в % за месяц между первым и последним периодом истории (CAGR).
 * null, если периодов меньше двух или выручка первого периода — 0 (не от чего считать рост).
 */
export function calculateAverageMonthlyGrowthRatePct(sortedHistory: FinancialInputs[]): number | null {
  if (sortedHistory.length < 2) return null
  const first = sortedHistory[0].revenue
  const last = sortedHistory[sortedHistory.length - 1].revenue
  if (first <= 0) return null
  const intervals = sortedHistory.length - 1
  return (Math.pow(last / first, 1 / intervals) - 1) * 100
}

export function calculateForecast(
  base: FinancialInputs,
  config: ForecastConfig,
  options: ForecastOptions = {},
): MonthlyForecastPoint[] {
  const months = options.months ?? 12
  const startMonthIndex = options.startMonthIndex ?? new Date().getMonth()
  const currentEmployeesCount = Math.max(1, options.currentEmployeesCount ?? 1)
  let runningCash = options.openingCash ?? 0

  const points: MonthlyForecastPoint[] = []
  // Два НЕЗАВИСИМЫХ драйвера выручки — salesCountGrowthPct двигает только количество продаж,
  // avgCheckGrowthPct только средний чек. Revenue = avgCheck × salesCount, поэтому их совместный
  // эффект на выручку — произведение (1+a)×(1+b), а не сумма. Раньше поле называлось
  // monthlyGrowthRatePct и подписывалось как «рост выручки», что вводило в заблуждение: при
  // ненулевом avgCheckGrowthPct фактический рост выручки оказывался выше заданного.
  const salesCountGrowthRate = config.salesCountGrowthPct / 100
  const marketingTrend = config.marketingBudgetTrendPct / 100
  const checkGrowth = config.avgCheckGrowthPct / 100
  const costPerEmployee = base.payroll / currentEmployeesCount
  const cogsRatio = base.revenue > 0 ? base.cogs / base.revenue : 0

  for (let i = 0; i < months; i++) {
    const seasonIdx = (startMonthIndex + i) % 12
    const seasonality = config.seasonality[seasonIdx] ?? 1
    const growthFactor = Math.pow(1 + salesCountGrowthRate, i + 1)
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
    runningCash += snapshot.cashFlow

    points.push({
      monthIndex: i,
      label: MONTH_LABELS[seasonIdx],
      revenue,
      expenses,
      netProfit: snapshot.netProfit,
      cashFlow: snapshot.cashFlow,
      cashBalance: runningCash,
    })
  }

  return points
}

export interface CashFlowGapWarning {
  /** Индекс месяца в прогнозе (0 = первый месяц прогноза). */
  monthIndex: number
  /** Короткая подпись месяца, как на графике прогноза (напр. "Дек"). */
  period: string
  /** На сколько остаток денег уходит в минус в этом месяце (положительное число). */
  shortfall: number
}

/**
 * Первый месяц прогноза, в котором накопительный остаток денег (cashBalance) уходит в минус —
 * то есть кассовый разрыв при сохранении текущих трендов (рост, сезонность, ставки прогноза),
 * если ничего не изменить. null — если за весь горизонт прогноза остаток не уходит в минус.
 * Не учитывает рост оборотного капитала при масштабировании бизнеса (см. calculateIncrementalWorkingCapital) —
 * это предупреждение по трендам, а не точный прогноз.
 */
export function findCashFlowGap(points: MonthlyForecastPoint[]): CashFlowGapWarning | null {
  const firstNegative = points.find((p) => p.cashBalance < 0)
  if (!firstNegative) return null
  return {
    monthIndex: firstNegative.monthIndex,
    period: firstNegative.label,
    shortfall: -firstNegative.cashBalance,
  }
}
