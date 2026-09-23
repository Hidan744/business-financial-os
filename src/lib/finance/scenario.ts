import type { FinancialInputs } from '@/types/finance'
import type { ScenarioMultipliers } from '@/types/scenario'

/**
 * Применяет мультипликаторы сценария к базовым исходным данным.
 * Выручка масштабируется пропорционально изменению чека и количества продаж
 * (base.revenue × avgCheck-множитель × salesCount-множитель), а не пересобирается
 * из avgCheck × salesCount с нуля — в реальных данных пользователя эти два числа
 * не обязаны давать точное произведение, и пересборка давала бы "фантомную"
 * дельту выручки даже при нулевом изменении параметров.
 */
export function calculateScenario(
  base: FinancialInputs,
  multipliers: ScenarioMultipliers,
): FinancialInputs {
  const avgCheck = base.avgCheck * multipliers.avgCheck
  const salesCount = base.salesCount * multipliers.salesCount
  const revenue = base.revenue * multipliers.avgCheck * multipliers.salesCount * multipliers.revenue

  return {
    ...base,
    avgCheck,
    salesCount,
    revenue,
    cogs: base.cogs * multipliers.cogs,
    // Переменные опер. расходы масштабируются вместе с себестоимостью — своего множителя у
    // variableOpex нет (сценарии сейчас двигают только COGS среди переменных затрат).
    variableOpex: (base.variableOpex ?? 0) * multipliers.cogs,
    marketing: base.marketing * multipliers.marketing,
    payroll: base.payroll * multipliers.payroll,
    rent: base.rent * multipliers.rent,
    taxes: base.taxes * multipliers.taxes,
  }
}
