import type { BalanceSheetInputs } from '@/types/finance'

export function emptyBalanceSheet(businessId: string, period: string): BalanceSheetInputs {
  return {
    businessId,
    period,
    currentAssets: { cash: 0, receivables: 0, inventory: 0, other: 0 },
    nonCurrentAssets: { fixedAssets: 0, other: 0 },
    currentLiabilities: { payables: 0, shortTermDebt: 0, other: 0 },
    nonCurrentLiabilities: { longTermDebt: 0, other: 0 },
  }
}

export interface BalanceSheetSnapshot {
  totalCurrentAssets: number
  totalNonCurrentAssets: number
  totalAssets: number
  totalCurrentLiabilities: number
  totalNonCurrentLiabilities: number
  totalLiabilities: number
  /** Собственный капитал = Активы − Обязательства (остаточная величина, не вводится напрямую). */
  equity: number
  /** Оборотные активы − Краткосрочные обязательства. */
  workingCapital: number
  /** Оборотные активы / Краткосрочные обязательства. null — если краткосрочных обязательств нет. */
  currentRatio: number | null
  /** Краткосрочные + долгосрочные кредиты — долг, по которому реально платятся проценты (без кредиторки). */
  interestBearingDebt: number
  /**
   * Долг / Капитал = Процентный долг (кредиты) / Капитал. Показывает именно кредитную нагрузку —
   * кредиторская задолженность (payables) в неё не входит, в отличие от Обязательства/Капитал ниже.
   * null — если капитал ≤ 0 (соотношение теряет смысл).
   */
  debtToEquity: number | null
  /**
   * Обязательства / Капитал = ВСЕ обязательства (кредиты + кредиторка + прочее) / Капитал —
   * более широкий и обычно больший показатель, чем Долг/Капитал. Не путать одно с другим:
   * бизнес без единого кредита, но с большой кредиторкой, будет иметь Долг/Капитал = 0,
   * но заметный Обязательства/Капитал. null — если капитал ≤ 0.
   */
  liabilitiesToEquity: number | null
  /** Капитал / Активы, % — коэффициент финансовой автономии. null — если активов нет. */
  equityRatioPct: number | null
}

export function buildBalanceSheetSnapshot(inputs: BalanceSheetInputs): BalanceSheetSnapshot {
  const totalCurrentAssets =
    inputs.currentAssets.cash + inputs.currentAssets.receivables + inputs.currentAssets.inventory + inputs.currentAssets.other
  const totalNonCurrentAssets = inputs.nonCurrentAssets.fixedAssets + inputs.nonCurrentAssets.other
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets

  const totalCurrentLiabilities =
    inputs.currentLiabilities.payables + inputs.currentLiabilities.shortTermDebt + inputs.currentLiabilities.other
  const totalNonCurrentLiabilities = inputs.nonCurrentLiabilities.longTermDebt + inputs.nonCurrentLiabilities.other
  const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities

  const equity = totalAssets - totalLiabilities
  const workingCapital = totalCurrentAssets - totalCurrentLiabilities

  const currentRatio = totalCurrentLiabilities > 0 ? totalCurrentAssets / totalCurrentLiabilities : null
  const interestBearingDebt = inputs.currentLiabilities.shortTermDebt + inputs.nonCurrentLiabilities.longTermDebt
  const debtToEquity = equity > 0 ? interestBearingDebt / equity : null
  const liabilitiesToEquity = equity > 0 ? totalLiabilities / equity : null
  const equityRatioPct = totalAssets > 0 ? (equity / totalAssets) * 100 : null

  return {
    totalCurrentAssets,
    totalNonCurrentAssets,
    totalAssets,
    totalCurrentLiabilities,
    totalNonCurrentLiabilities,
    totalLiabilities,
    equity,
    workingCapital,
    currentRatio,
    interestBearingDebt,
    debtToEquity,
    liabilitiesToEquity,
    equityRatioPct,
  }
}

export interface WorkingCapitalMetrics {
  /** Days Sales Outstanding — за сколько дней в среднем поступают деньги от клиентов. */
  dso: number | null
  /** Days Payables Outstanding — за сколько дней в среднем компания платит поставщикам. */
  dpo: number | null
  /** Days Inventory Outstanding — сколько дней в среднем товар лежит на складе. */
  dio: number | null
  /** Cash Conversion Cycle = DSO + DIO − DPO — сколько дней деньги "заморожены" в цикле. */
  cashConversionCycleDays: number | null
}

export interface PreviousPeriodBalances {
  receivables: number
  payables: number
  inventory: number
}

/**
 * daysInPeriod — длина периода, за который взяты revenue/cogs (30 для месяца).
 * revenue/cogs берутся за тот же период, что и остатки receivables/payables/inventory на конец периода.
 *
 * previous — остатки НА НАЧАЛО периода (т.е. на конец предыдущего периода). Если заданы, DSO/DPO/DIO
 * считаются по среднему остатку (начало + конец)/2 — стандартная практика для оборачиваемости, точнее
 * отражает типичный уровень остатка в течение периода, чем разовый снимок на конец. Без истории
 * (первый период бизнеса в системе) используется остаток на конец периода — среднее посчитать не из чего.
 */
export function calculateWorkingCapitalMetrics(
  receivables: number,
  payables: number,
  inventory: number,
  revenue: number,
  cogs: number,
  daysInPeriod = 30,
  previous?: PreviousPeriodBalances,
): WorkingCapitalMetrics {
  const avgReceivables = previous ? (receivables + previous.receivables) / 2 : receivables
  const avgPayables = previous ? (payables + previous.payables) / 2 : payables
  const avgInventory = previous ? (inventory + previous.inventory) / 2 : inventory

  const dso = revenue > 0 ? (avgReceivables / revenue) * daysInPeriod : null
  const dpo = cogs > 0 ? (avgPayables / cogs) * daysInPeriod : null
  const dio = cogs > 0 ? (avgInventory / cogs) * daysInPeriod : null
  const cashConversionCycleDays = dso !== null && dio !== null && dpo !== null ? dso + dio - dpo : null

  return { dso, dpo, dio, cashConversionCycleDays }
}

/**
 * Дополнительный оборотный капитал, который потребует рост бизнеса — при условии, что
 * оборачиваемость (DSO/DIO/DPO) останется на текущем уровне. Рост выручки без роста
 * оборотного капитала невозможен: больше дебиторки зависает в неоплаченных счетах,
 * больше денег заморожено в запасах — частично компенсируется ростом кредиторки.
 * null — если текущая оборачиваемость не определена (нет данных баланса или revenue/cogs = 0).
 */
export interface CashReconciliation {
  /** Остаток денег на конец периода по Cash Flow (openingBalance + netCashFlow). */
  cashFlowClosingBalance: number
  /** Остаток денег на конец периода по Балансу (currentAssets.cash). */
  balanceSheetCash: number
  /** balanceSheetCash − cashFlowClosingBalance. В идеале 0 — это одна и та же величина, введённая в двух местах. */
  gap: number
  /**
   * В отличие от сверки с упрощённым П&Л-расчётом (см. CashflowPage), это не оценка —
   * Cash Flow и Баланс описывают буквально один и тот же остаток денег на одну и ту же
   * дату, поэтому расхождение почти всегда означает ошибку ввода, а не разницу методик.
   * Порог — только округление (100 ₽), а не проценты от суммы.
   */
  isSignificant: boolean
}

export function reconcileCashWithBalanceSheet(cashFlowClosingBalance: number, balanceSheetCash: number): CashReconciliation {
  const gap = balanceSheetCash - cashFlowClosingBalance
  return {
    cashFlowClosingBalance,
    balanceSheetCash,
    gap,
    isSignificant: Math.abs(gap) > 100,
  }
}

export function calculateIncrementalWorkingCapital(
  currentRevenue: number,
  currentCogs: number,
  projectedRevenue: number,
  projectedCogs: number,
  metrics: WorkingCapitalMetrics,
  daysInPeriod = 30,
): number | null {
  if (metrics.dso === null || metrics.dio === null || metrics.dpo === null) return null
  const revenueDelta = projectedRevenue - currentRevenue
  const cogsDelta = projectedCogs - currentCogs
  const additionalReceivables = (revenueDelta / daysInPeriod) * metrics.dso
  const additionalInventory = (cogsDelta / daysInPeriod) * metrics.dio
  const additionalPayables = (cogsDelta / daysInPeriod) * metrics.dpo
  return additionalReceivables + additionalInventory - additionalPayables
}
