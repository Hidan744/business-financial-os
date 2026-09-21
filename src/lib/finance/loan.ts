/**
 * Ежемесячный аннуитетный платёж по кредиту.
 * При нулевой ставке — равномерное погашение тела без процентов.
 */
export function calculateAnnuityPayment(principal: number, annualRatePct: number, termMonths: number): number | null {
  if (principal <= 0 || termMonths <= 0) return null
  if (annualRatePct <= 0) return principal / termMonths

  const monthlyRate = annualRatePct / 100 / 12
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths))
}

export interface LoanMonthlySplit {
  payment: number
  /** Проценты за первый месяц — уменьшают прибыль. */
  interest: number
  /** Погашение тела за первый месяц — не влияет на прибыль, только на cash flow. */
  principalRepayment: number
}

/** Разбивка первого платежа на проценты и тело — для оценки эффекта нового кредита на текущий период. */
export function splitFirstMonthPayment(principal: number, annualRatePct: number, termMonths: number): LoanMonthlySplit | null {
  const payment = calculateAnnuityPayment(principal, annualRatePct, termMonths)
  if (payment === null) return null

  const monthlyRate = annualRatePct / 100 / 12
  const interest = principal * monthlyRate
  const principalRepayment = payment - interest
  return { payment, interest, principalRepayment }
}
