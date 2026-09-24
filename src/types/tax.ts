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
  /**
   * НДС не зависит от режима выше — считается отдельно и по желанию (с 2025 года часть бизнесов
   * на УСН тоже становится плательщиком НДС при превышении порога выручки). Ставку пользователь
   * указывает сам, а не выбирает из списка режимов: правила и пороги меняются быстрее калькулятора,
   * а пользователь всегда точнее знает свой актуальный статус плательщика.
   * Опционально — старые сохранённые настройки без этих полей читаются как isVatPayer: false.
   */
  isVatPayer?: boolean
  vatRatePct?: number
}

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  regime: 'usn_income_minus_expenses',
  usnIncomeRatePct: 6,
  usnIncomeMinusExpensesRatePct: 15,
  osnProfitTaxRatePct: 20,
  npdRatePct: 6,
  patentAnnualCost: 0,
  isVatPayer: false,
  vatRatePct: 20,
}
