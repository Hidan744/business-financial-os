import { describe, expect, it } from 'vitest'
import { buildAmortizationSchedule, calculateAnnuityPayment, splitFirstMonthPayment } from './loan'

describe('calculateAnnuityPayment', () => {
  it('returns null for non-positive principal or term', () => {
    expect(calculateAnnuityPayment(0, 12, 24)).toBeNull()
    expect(calculateAnnuityPayment(1000000, 12, 0)).toBeNull()
  })

  it('splits evenly when rate is zero', () => {
    expect(calculateAnnuityPayment(1200000, 0, 12)).toBe(100000)
  })

  it('computes a standard annuity payment', () => {
    // 1 000 000 at 18% annual over 12 months
    const payment = calculateAnnuityPayment(1000000, 18, 12)
    expect(payment).not.toBeNull()
    expect(payment!).toBeCloseTo(91679.99, 0)
  })
})

describe('splitFirstMonthPayment', () => {
  it('returns null when the payment cannot be computed', () => {
    expect(splitFirstMonthPayment(0, 18, 12)).toBeNull()
  })

  it('splits the first payment into interest and principal that sum to the total payment', () => {
    const split = splitFirstMonthPayment(1000000, 18, 12)
    expect(split).not.toBeNull()
    expect(split!.interest).toBeCloseTo(15000, 0)
    expect(split!.principalRepayment + split!.interest).toBeCloseTo(split!.payment, 5)
  })

  it('has zero interest when rate is zero', () => {
    const split = splitFirstMonthPayment(1200000, 0, 12)
    expect(split!.interest).toBe(0)
    expect(split!.principalRepayment).toBe(split!.payment)
  })
})

describe('buildAmortizationSchedule', () => {
  it('returns an empty schedule when the payment cannot be computed', () => {
    expect(buildAmortizationSchedule(0, 18, 12)).toEqual([])
  })

  it('has one row per month, ending at a zero balance', () => {
    const schedule = buildAmortizationSchedule(1000000, 18, 12)
    expect(schedule).toHaveLength(12)
    expect(schedule[11].remainingBalance).toBeCloseTo(0, 5)
  })

  it('has a decreasing interest portion and increasing principal portion over time', () => {
    const schedule = buildAmortizationSchedule(1000000, 18, 12)
    expect(schedule[0].interest).toBeGreaterThan(schedule[11].interest)
    expect(schedule[0].principal).toBeLessThan(schedule[11].principal)
  })

  it('every row payment equals interest + principal', () => {
    const schedule = buildAmortizationSchedule(1000000, 18, 12)
    for (const row of schedule) {
      expect(row.interest + row.principal).toBeCloseTo(row.payment, 5)
    }
  })

  it('handles a zero-rate loan as equal principal-only installments', () => {
    const schedule = buildAmortizationSchedule(1200000, 0, 12)
    expect(schedule[0].interest).toBe(0)
    expect(schedule[0].principal).toBeCloseTo(100000, 5)
    expect(schedule[11].remainingBalance).toBeCloseTo(0, 5)
  })
})
