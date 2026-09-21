/**
 * Явные предположения пользователя для расчёта LTV — не выводятся из данных
 * о поведении клиентов, которые система не собирает.
 */
export interface UnitEconomicsAssumptions {
  purchaseFrequencyPerMonth: number
  monthlyChurnRatePct: number
  /** Точный CAC, если пользователь отслеживает его отдельно. null — используется оценка (маркетинг / продажи). */
  manualCac: number | null
}

export const DEFAULT_UNIT_ECONOMICS_ASSUMPTIONS: UnitEconomicsAssumptions = {
  purchaseFrequencyPerMonth: 1,
  monthlyChurnRatePct: 10,
  manualCac: null,
}
