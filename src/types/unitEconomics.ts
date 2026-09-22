/**
 * Явные предположения пользователя для расчёта LTV — не выводятся из данных
 * о поведении клиентов, которые система не собирает.
 */
export interface UnitEconomicsAssumptions {
  purchaseFrequencyPerMonth: number
  monthlyChurnRatePct: number
  /** Точный CAC, если пользователь отслеживает его отдельно. null — используется оценка (маркетинг / продажи). */
  manualCac: number | null
  /**
   * Сколько НОВЫХ клиентов пришло за период — нужно для настоящего CAC (расходы / новые клиенты),
   * в отличие от текущей оценки "реклама / все продажи" (которая не отличает новых клиентов от
   * повторных покупок). Опционально — старые сохранённые записи читают как `?? 0` (значит "не указано").
   */
  newCustomersCount?: number
}

export const DEFAULT_UNIT_ECONOMICS_ASSUMPTIONS: UnitEconomicsAssumptions = {
  purchaseFrequencyPerMonth: 1,
  monthlyChurnRatePct: 10,
  manualCac: null,
  newCustomersCount: 0,
}
