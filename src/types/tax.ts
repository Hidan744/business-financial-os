export type TaxRegime = 'usn_income' | 'usn_income_minus_expenses' | 'osn' | 'patent' | 'npd'

export const TAX_REGIME_LABELS: Record<TaxRegime, string> = {
  usn_income: 'УСН «Доходы»',
  usn_income_minus_expenses: 'УСН «Доходы минус расходы»',
  osn: 'ОСН (налог на прибыль)',
  patent: 'Патент',
  npd: 'НПД (самозанятость)',
}

export interface TaxSettings {
  regime: TaxRegime
  usnIncomeRatePct: number // 1–6%, зависит от региона
  usnIncomeMinusExpensesRatePct: number // 5–15%, зависит от региона
  osnProfitTaxRatePct: number // стандартно 20%
  npdRatePct: number // 4% (физлица) или 6% (юрлица/ИП)
  patentAnnualCost: number // стоимость патента в год, ₽
}

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  regime: 'usn_income_minus_expenses',
  usnIncomeRatePct: 6,
  usnIncomeMinusExpensesRatePct: 15,
  osnProfitTaxRatePct: 20,
  npdRatePct: 6,
  patentAnnualCost: 0,
}
