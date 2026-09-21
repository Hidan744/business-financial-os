import { describe, expect, it } from 'vitest'
import {
  calculateAllowedCAC,
  calculateBreakEvenRevenue,
  calculateBreakEvenSales,
  calculateRequiredRevenue,
  calculateRequiredSales,
  calculateSafetyMarginPct,
  calculateWithdrawableAmount,
} from './breakeven'

describe('calculateBreakEvenRevenue', () => {
  it('computes fixed costs / contribution margin', () => {
    expect(calculateBreakEvenRevenue(1000, 0.5)).toBe(2000)
  })
  it('returns null when contribution margin is zero (would divide by zero)', () => {
    expect(calculateBreakEvenRevenue(1000, 0)).toBeNull()
  })
  it('returns null when contribution margin is negative', () => {
    expect(calculateBreakEvenRevenue(1000, -0.2)).toBeNull()
  })
  it('returns null when contribution margin is null', () => {
    expect(calculateBreakEvenRevenue(1000, null)).toBeNull()
  })
})

describe('calculateBreakEvenSales', () => {
  it('divides break-even revenue by avg check', () => {
    expect(calculateBreakEvenSales(2000, 500)).toBe(4)
  })
  it('returns null when avg check is zero', () => {
    expect(calculateBreakEvenSales(2000, 0)).toBeNull()
  })
  it('returns null when break-even revenue itself is null', () => {
    expect(calculateBreakEvenSales(null, 500)).toBeNull()
  })
})

describe('calculateSafetyMarginPct', () => {
  it('computes percentage above break-even', () => {
    expect(calculateSafetyMarginPct(2500, 2000)).toBe(20)
  })
  it('is negative when revenue is below break-even', () => {
    expect(calculateSafetyMarginPct(1500, 2000)).toBeCloseTo(-33.33, 1)
  })
  it('returns null on zero revenue', () => {
    expect(calculateSafetyMarginPct(0, 2000)).toBeNull()
  })
})

describe('calculateRequiredRevenue / calculateRequiredSales', () => {
  it('computes revenue needed for a target profit', () => {
    expect(calculateRequiredRevenue(500000, 300000, 0.4)).toBe(2000000)
  })
  it('returns null when contribution margin is not usable', () => {
    expect(calculateRequiredRevenue(500000, 300000, 0)).toBeNull()
  })
  it('computes required sales from required revenue and avg check', () => {
    expect(calculateRequiredSales(2000000, 5000)).toBe(400)
  })
})

describe('calculateAllowedCAC', () => {
  it('computes allowed CAC as contribution minus target profit per sale', () => {
    // contribution per sale = 5000 * 0.4 = 2000; profit per sale = 500000/400 = 1250
    expect(calculateAllowedCAC(5000, 0.4, 500000, 400)).toBe(750)
  })
  it('never returns negative CAC — clamps at zero', () => {
    expect(calculateAllowedCAC(1000, 0.1, 500000, 10)).toBe(0)
  })
  it('returns null when required sales is zero (division by zero guard)', () => {
    expect(calculateAllowedCAC(1000, 0.3, 100, 0)).toBeNull()
  })
})

describe('calculateWithdrawableAmount', () => {
  it('returns the amount above the minimum reserve', () => {
    expect(calculateWithdrawableAmount(500000, 200000)).toBe(300000)
  })
  it('clamps at zero when the balance is below the reserve', () => {
    expect(calculateWithdrawableAmount(100000, 200000)).toBe(0)
  })
  it('handles a zero reserve as fully withdrawable', () => {
    expect(calculateWithdrawableAmount(500000, 0)).toBe(500000)
  })
})
