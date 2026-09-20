import type { FinancialInputs } from '@/types/finance'
import type { ScenarioMultipliers } from '@/types/scenario'

/**
 * Применяет мультипликаторы сценария к базовым исходным данным.
 * revenue пересчитывается из salesCount * avgCheck, чтобы модель оставалась
 * внутренне непротиворечивой (нет рассинхрона "выручка" vs "чек × продажи").
 */
export function calculateScenario(
  base: FinancialInputs,
  multipliers: ScenarioMultipliers,
): FinancialInputs {
  const avgCheck = base.avgCheck * multipliers.avgCheck
  const salesCount = base.salesCount * multipliers.salesCount
  const revenue = avgCheck * salesCount * multipliers.revenue

  return {
    ...base,
    avgCheck,
    salesCount,
    revenue,
    cogs: base.cogs * multipliers.cogs,
    marketing: base.marketing * multipliers.marketing,
    payroll: base.payroll * multipliers.payroll,
    rent: base.rent * multipliers.rent,
    taxes: base.taxes * multipliers.taxes,
  }
}
