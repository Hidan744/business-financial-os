import type { BalanceSheetInputs, FinancialInputs } from '@/types/finance'
import type { MonthlyForecastPoint } from '@/types/scenario'
import { DEFAULT_FORECAST_CONFIG } from '@/types/scenario'
import type { TaxSettings } from '@/types/tax'
import { calculateForecast } from './forecast'
import { calculateRequiredRevenueForNetProfit, calculateRequiredSales } from './breakeven'
import { getFixedCosts, getVariableCosts } from './snapshot'

export interface FinancialPlanQuarter {
  quarter: number
  revenue: number
  netProfit: number
}

export interface FinancialPlanResult {
  /** Выручка в месяц, нужная для целевой годовой ЧИСТОЙ прибыли (после амортизации, процентов и налога). */
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
  /** true — цель недостижима ни при какой выручке при текущей структуре затрат (маржа ≤ 0). */
  targetUnreachable: boolean
  /** Помесячный прогноз (переиспользует общий Forecast engine — те же формулы, что в разделе «Прогноз»). */
  monthlyPoints: MonthlyForecastPoint[]
  quarters: FinancialPlanQuarter[]
}

/**
 * Строит план достижения целевой ГОДОВОЙ ЧИСТОЙ прибыли: находит нужную выручку через
 * calculateRequiredRevenueForNetProfit (решает итеративно через реальный P&L + налоговый
 * движок — амортизация, проценты и налог учтены, а не проигнорированы), затем темп роста,
 * который приведёт к этой выручке за monthsToTarget месяцев, и прогоняет его через тот же
 * calculateForecast, что использует раздел «Прогноз» (с теми же taxSettings/balanceSheet,
 * если они переданы) — план и прогноз всегда согласованы между собой, потому что считаются
 * одной и той же цепочкой функций.
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
  taxSettings?: TaxSettings,
  balanceSheet?: BalanceSheetInputs,
): FinancialPlanResult {
  if (monthsToTarget <= 0) {
    return {
      requiredMonthlyRevenue: null,
      requiredMonthlySales: null,
      requiredMonthlyGrowthRatePct: null,
      alreadyAchieved: false,
      targetUnreachable: false,
      monthlyPoints: [],
      quarters: [],
    }
  }

  const fixedCosts = getFixedCosts(base)
  const variableCosts = getVariableCosts(base)
  const variableCostRatio = base.revenue > 0 ? variableCosts / base.revenue : 0
  const monthlyTargetProfit = targetAnnualNetProfit / 12
  // Без переданных taxSettings — эффективная ставка налога ТЕКУЩЕГО периода, а не 0: лучше честная
  // оценка, чем молчаливое "налога нет" (тот же фоллбэк, что использует Forecast).
  const fallbackTaxRatePctOfRevenue = base.revenue > 0 ? base.taxes / base.revenue : 0

  const solved = calculateRequiredRevenueForNetProfit(
    monthlyTargetProfit,
    fixedCosts,
    variableCostRatio,
    base.depreciation,
    base.loanInterest,
    base.avgCheck,
    { taxSettings, fallbackRatePctOfRevenue: fallbackTaxRatePctOfRevenue },
  )
  const requiredMonthlyRevenue = solved.requiredRevenue
  const requiredMonthlySales = calculateRequiredSales(requiredMonthlyRevenue, base.avgCheck)
  const targetUnreachable = solved.status === 'target_unreachable'

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
          { months: monthsToTarget, currentEmployeesCount, taxSettings, balanceSheet },
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
    targetUnreachable,
    monthlyPoints,
    quarters,
  }
}
