/** Срок жизни клиента в месяцах = 1 / месячный отток. null — если отток не задан (0 или отрицательный). */
export function calculateCustomerLifetimeMonths(monthlyChurnRatePct: number): number | null {
  if (monthlyChurnRatePct <= 0) return null
  return 100 / monthlyChurnRatePct
}

/**
 * LTV = средний чек × валовая маржа × частота покупок в месяц × срок жизни клиента (мес).
 * Все четыре величины — либо реальные данные бизнеса (чек, маржа), либо явные предположения
 * пользователя (частота покупок, срок жизни) — LTV никогда не выводится из данных о фактическом
 * поведении клиентов, которые система не собирает.
 */
export function calculateLTV(
  avgCheck: number,
  grossMarginPct: number,
  purchaseFrequencyPerMonth: number,
  lifetimeMonths: number,
): number {
  return avgCheck * (grossMarginPct / 100) * purchaseFrequencyPerMonth * lifetimeMonths
}

export function calculateLtvCacRatio(ltv: number, cac: number): number | null {
  if (cac <= 0) return null
  return ltv / cac
}

/** Через сколько месяцев валовая прибыль с клиента окупает стоимость его привлечения. */
export function calculatePaybackMonths(
  cac: number,
  avgCheck: number,
  grossMarginPct: number,
  purchaseFrequencyPerMonth: number,
): number | null {
  const monthlyGrossProfitPerCustomer = avgCheck * (grossMarginPct / 100) * purchaseFrequencyPerMonth
  if (monthlyGrossProfitPerCustomer <= 0) return null
  return cac / monthlyGrossProfitPerCustomer
}
