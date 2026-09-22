import type { FinancialInputs } from '@/types/finance'
import type { MonthlyForecastPoint } from '@/types/scenario'
import { DEFAULT_FORECAST_CONFIG } from '@/types/scenario'
import { calculateContributionMarginPct } from './formulas'
import { calculateForecast } from './forecast'
import { calculateRequiredRevenue, calculateRequiredSales } from './breakeven'
import { getFixedCosts, getVariableCosts } from './snapshot'

export interface FinancialPlanQuarter {
  quarter: number
  revenue: number
  netProfit: number
}

export interface FinancialPlanResult {
  /** Выручка в месяц, нужная для целевой годовой чистой прибыли при текущей структуре затрат. */
  requiredMonthlyRevenue: number | null
  /** То же самое в штуках продаж при текущем среднем чеке. */
  requiredMonthlySales: number | null
  /**
   * Темп роста количества продаж в % в месяц, который приведёт от текущей выручки к требуемой
   * за monthsToTarget месяцев. Может быть отрицательным (если требуемая выручка ниже текущей —
   * цель уже перевыполняется) — в этом случае план строится на нулевом росте (alreadyAchieved).
   */
  requiredMonthlyGrowthRatePct: number | null
  /** true — текущая выручка уже покрывает целевую прибыль без дополнительного роста. */
  alreadyAchieved: boolean
  /** Помесячный прогноз (переиспользует общий Forecast engine — те же формулы, что в разделе «Прогноз»). */
  monthlyPoints: MonthlyForecastPoint[]
  quarters: FinancialPlanQuarter[]
}

/**
 * Строит план достижения целевой ГОДОВОЙ чистой прибыли: считает нужную выручку/продажи при
 * текущей марже, затем темп роста, который приведёт к этой выручке за monthsToTarget месяцев,
 * и прогоняет его через тот же calculateForecast, что использует раздел «Прогноз» — план и
 * прогноз всегда согласованы между собой, потому что считаются одной функцией.
 *
 * Рост распределяется только через рост количества продаж (salesCountGrowthPct) — план не
 * додумывает, что именно вырастет (цена, штат, реклама); это пользователь настраивает дальше
 * в разделе «Прогноз», если хочет other driver mix.
 */
export function buildFinancialPlan(
  base: FinancialInputs,
  targetAnnualNetProfit: number,
  monthsToTarget: number,
  currentEmployeesCount: number,
): FinancialPlanResult {
  if (monthsToTarget <= 0) {
    return {
      requiredMonthlyRevenue: null,
      requiredMonthlySales: null,
      requiredMonthlyGrowthRatePct: null,
      alreadyAchieved: false,
      monthlyPoints: [],
      quarters: [],
    }
  }

  const fixedCosts = getFixedCosts(base)
  const variableCosts = getVariableCosts(base)
  const contributionMarginPct = calculateContributionMarginPct(base.revenue, variableCosts)
  const monthlyTargetProfit = targetAnnualNetProfit / 12

  const requiredMonthlyRevenue = calculateRequiredRevenue(monthlyTargetProfit, fixedCosts, contributionMarginPct)
  const requiredMonthlySales = calculateRequiredSales(requiredMonthlyRevenue, base.avgCheck)

  const alreadyAchieved = requiredMonthlyRevenue !== null && base.revenue > 0 && requiredMonthlyRevenue <= base.revenue

  const requiredMonthlyGrowthRatePct =
    requiredMonthlyRevenue !== null && base.revenue > 0
      ? (Math.pow(requiredMonthlyRevenue / base.revenue, 1 / monthsToTarget) - 1) * 100
      : null

  const effectiveGrowthRatePct = alreadyAchieved ? 0 : requiredMonthlyGrowthRatePct

  const monthlyPoints =
    effectiveGrowthRatePct !== null
      ? calculateForecast(
          base,
          { ...DEFAULT_FORECAST_CONFIG, salesCountGrowthPct: effectiveGrowthRatePct },
          { months: monthsToTarget, currentEmployeesCount },
        )
      : []

  const quarters: FinancialPlanQuarter[] = []
  for (let i = 0; i < monthlyPoints.length; i += 3) {
    const chunk = monthlyPoints.slice(i, i + 3)
    quarters.push({
      quarter: quarters.length + 1,
      revenue: chunk.reduce((s, p) => s + p.revenue, 0),
      netProfit: chunk.reduce((s, p) => s + p.netProfit, 0),
    })
  }

  return {
    requiredMonthlyRevenue,
    requiredMonthlySales,
    requiredMonthlyGrowthRatePct,
    alreadyAchieved,
    monthlyPoints,
    quarters,
  }
}
