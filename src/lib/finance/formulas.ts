/**
 * Базовые формулы P&L. Все функции — чистые, без побочных эффектов.
 * Деление на ноль / некорректные входные данные не бросают исключений и не
 * возвращают NaN — они возвращают null, а UI обязан обработать null явно.
 */

export function calculateGrossProfit(revenue: number, cogs: number): number {
  return revenue - cogs
}

export function calculateGrossMargin(grossProfit: number, revenue: number): number | null {
  if (revenue <= 0) return null
  return (grossProfit / revenue) * 100
}

export function calculateEBITDA(grossProfit: number, fixedCosts: number): number {
  return grossProfit - fixedCosts
}

export function calculateEBITDAMargin(ebitda: number, revenue: number): number | null {
  if (revenue <= 0) return null
  return (ebitda / revenue) * 100
}

export function calculateEBIT(ebitda: number, depreciation: number): number {
  return ebitda - depreciation
}

export function calculateEBITMargin(ebit: number, revenue: number): number | null {
  if (revenue <= 0) return null
  return (ebit / revenue) * 100
}

export function calculateNetProfit(
  ebitda: number,
  depreciation: number,
  loanInterest: number,
  taxes: number,
): number {
  return ebitda - depreciation - loanInterest - taxes
}

export function calculateNetMargin(netProfit: number, revenue: number): number | null {
  if (revenue <= 0) return null
  return (netProfit / revenue) * 100
}

/** Доля переменных затрат от выручки, покрывающая постоянные расходы: (revenue - variableCosts) / revenue */
export function calculateContributionMarginPct(revenue: number, variableCosts: number): number | null {
  if (revenue <= 0) return null
  return (revenue - variableCosts) / revenue
}

export function calculateROI(profit: number, investment: number): number | null {
  if (investment <= 0) return null
  return (profit / investment) * 100
}

/**
 * НЕ настоящий ROMI. Использует всю выручку компании, а не выручку, привлечённую именно рекламой —
 * система не различает, какие продажи пришли из рекламы, а какие нет. Это грубая прикидка
 * «сколько бизнес в среднем заработал на рубль рекламных расходов», а не возврат на маркетинг.
 * Используйте calculateROMI(), когда известна выручка, атрибутированная маркетингу.
 */
export function calculateMarketingEfficiencyPct(totalRevenue: number, marketingCost: number): number | null {
  if (marketingCost <= 0) return null
  return ((totalRevenue - marketingCost) / marketingCost) * 100
}

/**
 * Настоящий ROMI (Return on Marketing Investment): валовая прибыль с выручки, атрибутированной
 * маркетингу, за вычетом затрат на маркетинг, делённая на затраты на маркетинг.
 * null — если нет данных по атрибутированной выручке или расходы на маркетинг ≤ 0.
 */
export function calculateROMI(attributedRevenue: number, grossMarginPct: number, marketingCost: number): number | null {
  if (marketingCost <= 0 || attributedRevenue <= 0) return null
  return ((attributedRevenue * (grossMarginPct / 100) - marketingCost) / marketingCost) * 100
}

/** ROAS (Return on Ad Spend): атрибутированная выручка / затраты на маркетинг. В отличие от ROMI — без учёта маржи. */
export function calculateROAS(attributedRevenue: number, marketingCost: number): number | null {
  if (marketingCost <= 0 || attributedRevenue <= 0) return null
  return attributedRevenue / marketingCost
}

/** CAC (Customer Acquisition Cost): затраты на продажи и маркетинг / количество НОВЫХ клиентов за период. */
export function calculateCAC(salesAndMarketingSpend: number, newCustomers: number): number | null {
  if (newCustomers <= 0) return null
  return salesAndMarketingSpend / newCustomers
}

/** CPA (Cost per Acquisition/Action): рекламные расходы / количество конверсий (заявок, лидов, покупок). */
export function calculateCPA(adSpend: number, conversions: number): number | null {
  if (conversions <= 0) return null
  return adSpend / conversions
}

/** Debt Service Ratio: обязательные платежи по долгу за период (тело + проценты) / выручка за тот же период. */
export function calculateDebtServiceRatio(debtService: number, revenue: number): number | null {
  if (revenue <= 0) return null
  return (debtService / revenue) * 100
}

export function calculateRevenuePerEmployee(revenue: number, employeesCount: number): number | null {
  if (employeesCount <= 0) return null
  return revenue / employeesCount
}

/** Приблизительная стоимость продажи: реклама / кол-во продаж — не настоящий CAC (нет данных по новым клиентам). */
export function calculateApproxCostPerSale(marketing: number, salesCount: number): number | null {
  if (salesCount <= 0) return null
  return marketing / salesCount
}

/** % изменения показателя к предыдущему значению. null, если базовое значение — 0 (нет смысла считать %). */
export function calculatePeriodGrowthPct(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

/**
 * Долговая нагрузка относительно операционной прибыли: ОСТАТОК долга (на конец периода, из баланса) /
 * годовая EBITDA. Это не то же самое, что платежи по долгу — компания с большим остатком долга и
 * маленькими текущими платежами (длинный срок) всё равно закредитована сильнее, чем показывают платежи.
 */
export function calculateDebtToEBITDA(outstandingDebt: number, annualEBITDA: number): number | null {
  if (annualEBITDA <= 0) return null
  return outstandingDebt / annualEBITDA
}

/**
 * Debt Service Coverage Ratio: во сколько раз свободный денежный поток покрывает обязательные
 * платежи по долгу (тело + проценты) за период. ≥1.2 — обычно считается безопасным ориентиром.
 * По умолчанию (без taxes/maintenanceCapex/changeInWorkingCapital) — упрощённая версия от EBITDA,
 * как раньше. Передавайте их, когда данные есть — иначе показатель систематически завышен: EBITDA
 * сама по себе — это прибыль ДО налогов и капитальных затрат, которые тоже съедают кэш до
 * обслуживания долга.
 */
export function calculateDSCR(
  ebitda: number,
  debtService: number,
  taxes = 0,
  maintenanceCapex = 0,
  changeInWorkingCapital = 0,
): number | null {
  if (debtService <= 0) return null
  const cashAvailableForDebtService = ebitda - taxes - maintenanceCapex - changeInWorkingCapital
  return cashAvailableForDebtService / debtService
}
