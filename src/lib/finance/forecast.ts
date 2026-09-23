import type { BalanceSheetInputs, FinancialInputs } from '@/types/finance'
import type { ForecastConfig, MonthlyForecastPoint } from '@/types/scenario'
import type { TaxSettings } from '@/types/tax'
import { buildFinancialSnapshot, getFixedCosts } from './snapshot'
import { calculateIncrementalWorkingCapital, calculateWorkingCapitalMetrics } from './balanceSheet'
import { estimateTaxForProjection } from './tax'

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
  /**
   * Настройки налогового режима — если заданы, налог на КАЖДЫЙ прогнозный месяц считается точно
   * через реальный tax engine (calculateTaxForRegime), тот же, что на странице «Налоги». Без них
   * налог оценивается по текущей эффективной ставке от выручки (base.taxes / base.revenue) —
   * это лучше, чем раньше (когда сумма налога просто копировалась в каждый месяц без изменений),
   * но менее точно для нелинейных режимов (напр. минимальный налог на УСН «Доходы минус расходы»).
   */
  taxSettings?: TaxSettings
  /**
   * Баланс на начало прогноза — если задан, прирост дебиторки и запасов минус прирост кредиторки
   * при росте выручки (см. calculateIncrementalWorkingCapital) вычитается из денежного потока
   * КАЖДОГО месяца, а не остаётся "невидимым" числом только на графике. Оборачиваемость
   * (DSO/DIO/DPO) берётся из этого баланса и считается неизменной на весь горизонт прогноза.
   */
  balanceSheet?: BalanceSheetInputs
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
  // Фоллбэк для налога, когда режим не передан — эффективная ставка ТЕКУЩЕГО периода от выручки,
  // а не замороженная сумма (см. estimateTaxForProjection / ForecastOptions.taxSettings).
  const fallbackTaxRatePctOfRevenue = base.revenue > 0 ? base.taxes / base.revenue : 0

  const workingCapitalMetrics = options.balanceSheet
    ? calculateWorkingCapitalMetrics(
        options.balanceSheet.currentAssets.receivables,
        options.balanceSheet.currentLiabilities.payables,
        options.balanceSheet.currentAssets.inventory,
        base.revenue,
        base.cogs,
      )
    : null
  let prevRevenue = base.revenue
  let prevCogs = base.cogs

  for (let i = 0; i < months; i++) {
    const seasonIdx = (startMonthIndex + i) % 12
    const seasonality = config.seasonality[seasonIdx] ?? 1
    const growthFactor = Math.pow(1 + salesCountGrowthRate, i + 1)
    const avgCheck = base.avgCheck * Math.pow(1 + checkGrowth, i + 1)
    const salesCount = base.salesCount * growthFactor * seasonality
    const revenue = avgCheck * salesCount
    const cogs = cogsRatio * revenue

    const marketing = Math.max(0, base.marketing * Math.pow(1 + marketingTrend, i + 1))
    const additionalEmployees = config.employeesGrowth * ((i + 1) / months)
    const payroll = base.payroll + additionalEmployees * costPerEmployee

    // Налог не может остаться суммой текущего периода, скопированной в каждый месяц — иначе он
    // не реагирует на изменение выручки вовсе. EBIT для tax engine считается ДО налога (сам EBIT
    // от налога не зависит), поэтому его можно получить из "чернового" снэпшота с taxes=0.
    const inputsBeforeTax: FinancialInputs = { ...base, revenue, avgCheck, salesCount, marketing, cogs, payroll, taxes: 0 }
    const fixedCosts = getFixedCosts(inputsBeforeTax)
    const draftSnapshot = buildFinancialSnapshot(inputsBeforeTax)
    const projectedTax = estimateTaxForProjection(revenue, cogs + fixedCosts, draftSnapshot.ebit, {
      taxSettings: options.taxSettings,
      fallbackRatePctOfRevenue: fallbackTaxRatePctOfRevenue,
    })

    const inputs: FinancialInputs = { ...inputsBeforeTax, taxes: projectedTax }
    const snapshot = buildFinancialSnapshot(inputs)
    const expenses = inputs.cogs + fixedCosts + inputs.taxes + inputs.loanInterest

    // Прирост оборотного капитала (ΔAR + ΔInventory − ΔAP) месяц-к-месяцу — деньги, замороженные
    // в дебиторке и запасах при росте выручки, не то же самое, что прибыль (см. spec §17, §20).
    // Не влияет на netProfit (P&L), только на денежный поток.
    const incrementalWorkingCapital = workingCapitalMetrics
      ? (calculateIncrementalWorkingCapital(prevRevenue, prevCogs, revenue, cogs, workingCapitalMetrics) ?? 0)
      : 0

    const cashFlow = snapshot.cashFlow - incrementalWorkingCapital
    runningCash += cashFlow
    prevRevenue = revenue
    prevCogs = cogs

    points.push({
      monthIndex: i,
      label: MONTH_LABELS[seasonIdx],
      revenue,
      expenses,
      netProfit: snapshot.netProfit,
      cashFlow,
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
 * то есть кассовый разрыв при сохранении текущих трендов (рост, сезонность, ставки прогноза,
 * налог и оборотный капитал — см. ForecastOptions), если ничего не изменить. null — если за весь
 * горизонт прогноза остаток не уходит в минус.
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
