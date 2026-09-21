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

export function calculateROMI(revenueFromMarketing: number, marketingCost: number): number | null {
  if (marketingCost <= 0) return null
  return ((revenueFromMarketing - marketingCost) / marketingCost) * 100
}

export function calculateDebtLoad(loanPayments: number, revenue: number): number | null {
  if (revenue <= 0) return null
  return (loanPayments / revenue) * 100
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
