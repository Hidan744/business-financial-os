/**
 * Точка безубыточности и расчёт целевого дохода.
 * contributionMarginPct — доля от выручки, покрывающая постоянные расходы (0..1).
 */

export function calculateBreakEvenRevenue(
  fixedCosts: number,
  contributionMarginPct: number | null,
): number | null {
  if (contributionMarginPct === null || contributionMarginPct <= 0) return null
  return fixedCosts / contributionMarginPct
}

export function calculateBreakEvenSales(
  breakEvenRevenue: number | null,
  avgCheck: number,
): number | null {
  if (breakEvenRevenue === null || avgCheck <= 0) return null
  return breakEvenRevenue / avgCheck
}

/** Запас финансовой прочности: насколько текущая выручка выше точки безубыточности. */
export function calculateSafetyMarginPct(
  revenue: number,
  breakEvenRevenue: number | null,
): number | null {
  if (revenue <= 0) return null
  if (breakEvenRevenue === null) return null
  return ((revenue - breakEvenRevenue) / revenue) * 100
}

export function calculateRequiredRevenue(
  targetProfit: number,
  fixedCosts: number,
  contributionMarginPct: number | null,
): number | null {
  if (contributionMarginPct === null || contributionMarginPct <= 0) return null
  return (targetProfit + fixedCosts) / contributionMarginPct
}

export function calculateRequiredSales(
  requiredRevenue: number | null,
  avgCheck: number,
): number | null {
  if (requiredRevenue === null || avgCheck <= 0) return null
  return requiredRevenue / avgCheck
}

/**
 * Допустимая стоимость привлечения клиента (CAC), при которой цель по прибыли
 * всё ещё достижима: маржинальная прибыль с продажи минус целевая прибыль на продажу.
 */
export function calculateAllowedCAC(
  avgCheck: number,
  contributionMarginPct: number | null,
  targetProfit: number,
  requiredSales: number | null,
): number | null {
  if (contributionMarginPct === null || requiredSales === null || requiredSales <= 0) return null
  const contributionPerSale = avgCheck * contributionMarginPct
  const profitPerSale = targetProfit / requiredSales
  const cac = contributionPerSale - profitPerSale
  return Math.max(0, cac)
}

/** Сколько можно вывести из бизнеса сейчас, не опускаясь ниже минимального резерва. */
export function calculateWithdrawableAmount(cashBalance: number, minimumReserve: number): number {
  return Math.max(0, cashBalance - minimumReserve)
}
