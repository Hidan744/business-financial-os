import type { BalanceSheetInputs, FinancialInputs } from '@/types/finance'
import type { ForecastConfig, MonthlyForecastBalanceSheet, MonthlyForecastPoint } from '@/types/scenario'
import type { TaxSettings } from '@/types/tax'
import { buildFinancialSnapshot, getFixedCosts } from './snapshot'
import { buildBalanceSheetSnapshot, calculateIncrementalWorkingCapital, calculateWorkingCapitalMetrics } from './balanceSheet'
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
  // Без явного openingCash, но с переданным balanceSheet — берём остаток денег оттуда
  // (currentAssets.cash), а не 0: иначе прогнозный баланс расходится с фактическим стартовым
  // балансом на ту же сумму денег, введённую в двух разных местах (см. reconcileCashWithBalanceSheet
  // для того же принципа сверки в Cash Flow ↔ Баланс).
  let runningCash = options.openingCash ?? options.balanceSheet?.currentAssets.cash ?? 0

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
  // Переменные операционные расходы (комиссии, эквайринг, доставка за ед.) масштабируются с
  // выручкой тем же способом, что и COGS — та же логика "доля от выручки постоянна".
  const variableOpexRatio = base.revenue > 0 ? (base.variableOpex ?? 0) / base.revenue : 0
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

  // Driver-based Balance Sheet projection — только если есть с чего катить вперёд. Основные
  // средства и долг идут от факта (Баланс), капитал — от факта + накопленная прибыль вперёд
  // (нераспределённая прибыль), дебиторка/запасы/кредиторка — от DSO/DIO/DPO текущего баланса,
  // применённых к прогнозной выручке/себестоимости каждого месяца.
  const monthlyCapex = options.balanceSheet ? (config.monthlyCapex ?? 0) : 0
  let runningFixedAssets = options.balanceSheet?.nonCurrentAssets.fixedAssets ?? 0
  let runningDebtBalance = options.balanceSheet
    ? options.balanceSheet.currentLiabilities.shortTermDebt + options.balanceSheet.nonCurrentLiabilities.longTermDebt
    : 0
  let runningEquity = options.balanceSheet ? buildBalanceSheetSnapshot(options.balanceSheet).equity : 0

  for (let i = 0; i < months; i++) {
    const seasonIdx = (startMonthIndex + i) % 12
    const seasonality = config.seasonality[seasonIdx] ?? 1
    const growthFactor = Math.pow(1 + salesCountGrowthRate, i + 1)
    const avgCheck = base.avgCheck * Math.pow(1 + checkGrowth, i + 1)
    const salesCount = base.salesCount * growthFactor * seasonality
    const revenue = avgCheck * salesCount
    const cogs = cogsRatio * revenue
    const variableOpex = variableOpexRatio * revenue

    const marketing = Math.max(0, base.marketing * Math.pow(1 + marketingTrend, i + 1))
    const additionalEmployees = config.employeesGrowth * ((i + 1) / months)
    const payroll = base.payroll + additionalEmployees * costPerEmployee

    // Налог не может остаться суммой текущего периода, скопированной в каждый месяц — иначе он
    // не реагирует на изменение выручки вовсе. EBIT для tax engine считается ДО налога (сам EBIT
    // от налога не зависит), поэтому его можно получить из "чернового" снэпшота с taxes=0.
    const inputsBeforeTax: FinancialInputs = { ...base, revenue, avgCheck, salesCount, marketing, cogs, variableOpex, payroll, taxes: 0 }
    const fixedCosts = getFixedCosts(inputsBeforeTax)
    const draftSnapshot = buildFinancialSnapshot(inputsBeforeTax)
    const projectedTax = estimateTaxForProjection(revenue, cogs + variableOpex + fixedCosts, draftSnapshot.ebit, {
      taxSettings: options.taxSettings,
      fallbackRatePctOfRevenue: fallbackTaxRatePctOfRevenue,
    })

    const inputs: FinancialInputs = { ...inputsBeforeTax, taxes: projectedTax }
    const snapshot = buildFinancialSnapshot(inputs)
    const expenses = inputs.cogs + variableOpex + fixedCosts + inputs.taxes + inputs.loanInterest

    // Прирост оборотного капитала (ΔAR + ΔInventory − ΔAP) месяц-к-месяцу — деньги, замороженные
    // в дебиторке и запасах при росте выручки, не то же самое, что прибыль (см. spec §17, §20).
    // Не влияет на netProfit (P&L), только на денежный поток.
    const incrementalWorkingCapital = workingCapitalMetrics
      ? (calculateIncrementalWorkingCapital(prevRevenue, prevCogs, revenue, cogs, workingCapitalMetrics) ?? 0)
      : 0

    // snapshot.cashFlow уже вычло ПОЛНЫЙ base.loanPayments (тело кредита) как отток — верно, пока
    // долг ещё есть. Но если driver-based график (ниже) показывает, что долг уже погашен раньше,
    // дальше платить нечего — иначе денежный поток продолжал бы "платить" по кредиту, которого
    // больше нет, и баланс переставал бы сходиться (Cash уходит, а Долг уже 0 — фантомный отток).
    const debtBalanceBeforePayment = runningDebtBalance
    const actualPrincipalPaid = options.balanceSheet ? Math.min(base.loanPayments, debtBalanceBeforePayment) : base.loanPayments
    const phantomLoanPaymentExcess = base.loanPayments - actualPrincipalPaid

    const cashFlow = snapshot.cashFlow - incrementalWorkingCapital - monthlyCapex + phantomLoanPaymentExcess
    runningCash += cashFlow
    prevRevenue = revenue
    prevCogs = cogs

    let balanceSheetPoint: MonthlyForecastBalanceSheet | undefined
    if (options.balanceSheet) {
      runningFixedAssets = Math.max(0, runningFixedAssets + monthlyCapex - base.depreciation)
      runningDebtBalance = debtBalanceBeforePayment - actualPrincipalPaid
      runningEquity += snapshot.netProfit

      const receivables = workingCapitalMetrics && workingCapitalMetrics.dso !== null ? (revenue / 30) * workingCapitalMetrics.dso : 0
      const inventory = workingCapitalMetrics && workingCapitalMetrics.dio !== null ? (cogs / 30) * workingCapitalMetrics.dio : 0
      const payables = workingCapitalMetrics && workingCapitalMetrics.dpo !== null ? (cogs / 30) * workingCapitalMetrics.dpo : 0

      const otherCurrentAssets = options.balanceSheet.currentAssets.other
      const otherNonCurrentAssets = options.balanceSheet.nonCurrentAssets.other
      const otherCurrentLiabilities = options.balanceSheet.currentLiabilities.other
      const otherNonCurrentLiabilities = options.balanceSheet.nonCurrentLiabilities.other

      const totalAssets = runningCash + receivables + inventory + otherCurrentAssets + runningFixedAssets + otherNonCurrentAssets
      const totalLiabilities = payables + runningDebtBalance + otherCurrentLiabilities + otherNonCurrentLiabilities

      balanceSheetPoint = {
        capex: monthlyCapex,
        fixedAssets: runningFixedAssets,
        debtBalance: runningDebtBalance,
        receivables,
        inventory,
        payables,
        equity: runningEquity,
        totalAssets,
        totalLiabilities,
        identityGap: totalAssets - totalLiabilities - runningEquity,
      }
    }

    points.push({
      monthIndex: i,
      label: MONTH_LABELS[seasonIdx],
      revenue,
      expenses,
      netProfit: snapshot.netProfit,
      cashFlow,
      cashBalance: runningCash,
      balanceSheet: balanceSheetPoint,
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
