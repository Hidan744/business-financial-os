import type { TaxRegime, TaxSettings } from '@/types/tax'

/** УСН «Доходы»: налог = выручка × ставка. */
export function calculateUsnIncomeTax(revenue: number, ratePct: number): number {
  return Math.max(0, revenue) * (ratePct / 100)
}

/**
 * УСН «Доходы минус расходы»: налог = (выручка − расходы) × ставка, но не меньше 1% от выручки
 * (минимальный налог — обязателен по закону, даже если бизнес сработал в убыток).
 */
export function calculateUsnIncomeMinusExpensesTax(revenue: number, expenses: number, ratePct: number): number {
  const base = Math.max(0, revenue - expenses)
  const calculated = base * (ratePct / 100)
  const minimumTax = Math.max(0, revenue) * 0.01
  return Math.max(calculated, minimumTax)
}

/** Патент — фиксированная стоимость, не зависит от фактической выручки. */
export function calculatePatentMonthlyCost(annualCost: number): number {
  return Math.max(0, annualCost) / 12
}

/** НПД (самозанятость): налог = выручка × ставка (4% с физлиц, 6% с ИП/юрлиц). */
export function calculateNpdTax(revenue: number, ratePct: number): number {
  return Math.max(0, revenue) * (ratePct / 100)
}

/** ОСН, налог на прибыль: ставка × прибыль до налога (EBIT). Без НДС — для НДС нужен отдельный учёт входящего/исходящего налога. */
export function calculateOsnProfitTax(ebit: number, ratePct: number): number {
  return Math.max(0, ebit) * (ratePct / 100)
}

/**
 * НДС к уплате = исходящий налог (с выручки) минус входящий (с расходов, по которым он к вычету).
 * revenue и vatDeductibleExpenses считаются суммами с учётом НДС (как их вводят в остальном
 * приложении) — поэтому налог выделяется расчётной ставкой rate/(100+rate), а не начисляется
 * сверху. Результат может быть отрицательным — переплата (право на возврат/зачёт), а не 0.
 * Независим от режима налога на прибыль/дохода (calculateTaxForRegime) — это отдельный налог,
 * не альтернатива ему.
 */
export function calculateVatPayable(revenue: number, vatDeductibleExpenses: number, vatRatePct: number): number {
  const factor = vatRatePct / (100 + vatRatePct)
  const outputVat = Math.max(0, revenue) * factor
  const inputVat = Math.max(0, vatDeductibleExpenses) * factor
  return outputVat - inputVat
}

export interface TaxCalculationResult {
  amount: number
  /** Пояснение для конкретного режима — показывается пользователю рядом с суммой. */
  note: string
}

export interface TaxProjectionContext {
  /** Настройки налогового режима бизнеса — если заданы, налог на прогнозный период считается точно
   *  через calculateTaxForRegime (тот же движок, что на странице «Налоги»), а не приблизительно. */
  taxSettings?: TaxSettings
  /**
   * Фоллбэк, когда режим для данного расчёта не передан: эффективная ставка налога от выручки —
   * обычно (текущий Tax / текущая Revenue) базового периода. Так налог хотя бы масштабируется
   * вместе с прогнозной выручкой, а не остаётся замороженным числом текущего периода.
   */
  fallbackRatePctOfRevenue?: number
}

/**
 * Единая точка прогноза налога для будущего периода (Forecast, Financial Plan, AI CFO) — чтобы
 * методика не расходилась между модулями. С taxSettings — точный расчёт по выбранному режиму;
 * без него — оценка по текущей эффективной ставке от выручки.
 */
export function estimateTaxForProjection(
  revenue: number,
  expenses: number,
  ebit: number,
  context: TaxProjectionContext,
): number {
  if (context.taxSettings) {
    return calculateTaxForRegime(context.taxSettings.regime, context.taxSettings, { revenue, expenses, ebit }).amount
  }
  const rate = context.fallbackRatePctOfRevenue ?? 0
  return Math.max(0, revenue) * rate
}

/** Считает налог за период для выбранного режима на основе текущих настроек и финансовых данных. */
export function calculateTaxForRegime(
  regime: TaxRegime,
  settings: TaxSettings,
  params: { revenue: number; expenses: number; ebit: number },
): TaxCalculationResult {
  switch (regime) {
    case 'usn_income':
      return {
        amount: calculateUsnIncomeTax(params.revenue, settings.usnIncomeRatePct),
        note: `${settings.usnIncomeRatePct}% от выручки.`,
      }
    case 'usn_income_minus_expenses':
      return {
        amount: calculateUsnIncomeMinusExpensesTax(params.revenue, params.expenses, settings.usnIncomeMinusExpensesRatePct),
        note: `${settings.usnIncomeMinusExpensesRatePct}% от (выручка − расходы), но не меньше 1% от выручки (минимальный налог).`,
      }
    case 'patent':
      return {
        amount: calculatePatentMonthlyCost(settings.patentAnnualCost),
        note: 'Фиксированная стоимость патента в месяц — не зависит от фактической выручки.',
      }
    case 'npd':
      return {
        amount: calculateNpdTax(params.revenue, settings.npdRatePct),
        note: `${settings.npdRatePct}% от выручки.`,
      }
    case 'osn':
      return {
        amount: calculateOsnProfitTax(params.ebit, settings.osnProfitTaxRatePct),
        note: `${settings.osnProfitTaxRatePct}% от прибыли до налога (EBIT). Без НДС — для него нужен отдельный учёт входящего/исходящего налога.`,
      }
  }
}
