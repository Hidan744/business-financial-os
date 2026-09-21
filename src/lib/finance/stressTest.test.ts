import { describe, expect, it } from 'vitest'
import type { FinancialInputs } from '@/types/finance'
import {
  applyClientLossShock,
  applyCogsShock,
  applyFixedCostShock,
  applyRevenueShock,
  calculateFundingNeeded,
  calculateRunwayMonths,
} from './stressTest'

function makeInputs(overrides: Partial<FinancialInputs> = {}): FinancialInputs {
  return {
    businessId: 'b1',
    period: '2026-09',
    revenue: 2400000,
    cogs: 720000,
    payroll: 520000,
    rent: 220000,
    marketing: 150000,
    logistics: 0,
    utilities: 0,
    software: 0,
    customExpenseLines: [{ id: '1', label: 'Прочее', amount: 180000 }],
    depreciation: 0,
    loanInterest: 0,
    taxes: 90000,
    loanPayments: 50000,
    avgCheck: 850,
    salesCount: 2824,
    ...overrides,
  }
}

describe('applyRevenueShock', () => {
  it('reduces revenue, salesCount and cogs proportionally', () => {
    const result = applyRevenueShock(makeInputs(), 20)
    expect(result.revenue).toBeCloseTo(2400000 * 0.8)
    expect(result.salesCount).toBeCloseTo(2824 * 0.8)
    expect(result.cogs).toBeCloseTo(720000 * 0.8)
  })
  it('leaves fixed costs untouched', () => {
    const result = applyRevenueShock(makeInputs(), 20)
    expect(result.payroll).toBe(520000)
    expect(result.rent).toBe(220000)
  })
})

describe('applyFixedCostShock', () => {
  it('scales fixed cost lines and custom expense lines, leaves cogs/revenue untouched', () => {
    const result = applyFixedCostShock(makeInputs(), 10)
    expect(result.payroll).toBeCloseTo(520000 * 1.1)
    expect(result.rent).toBeCloseTo(220000 * 1.1)
    expect(result.customExpenseLines[0].amount).toBeCloseTo(180000 * 1.1)
    expect(result.cogs).toBe(720000)
    expect(result.revenue).toBe(2400000)
  })
})

describe('applyCogsShock', () => {
  it('scales only cogs', () => {
    const result = applyCogsShock(makeInputs(), 10)
    expect(result.cogs).toBeCloseTo(720000 * 1.1)
    expect(result.revenue).toBe(2400000)
  })
})

describe('applyClientLossShock', () => {
  it('behaves like a revenue shock with the given loss percentage', () => {
    const result = applyClientLossShock(makeInputs(), 25)
    expect(result.revenue).toBeCloseTo(2400000 * 0.75)
  })
})

describe('calculateRunwayMonths', () => {
  it('returns null when cash flow is non-negative', () => {
    expect(calculateRunwayMonths(500000, 0)).toBeNull()
    expect(calculateRunwayMonths(500000, 10000)).toBeNull()
  })
  it('returns 0 when there is no cash reserve left', () => {
    expect(calculateRunwayMonths(0, -50000)).toBe(0)
    expect(calculateRunwayMonths(-1000, -50000)).toBe(0)
  })
  it('computes months of runway from cash balance and burn rate', () => {
    expect(calculateRunwayMonths(300000, -100000)).toBe(3)
  })
})

describe('calculateFundingNeeded', () => {
  it('returns 0 when cash flow is non-negative', () => {
    expect(calculateFundingNeeded(0, 10000, 6)).toBe(0)
  })
  it('returns 0 when the existing cash balance already covers the horizon', () => {
    expect(calculateFundingNeeded(1000000, -50000, 6)).toBe(0)
  })
  it('computes the shortfall beyond the existing cash balance', () => {
    // burn 100k/mo for 6mo = 600k needed, only 200k on hand -> need 400k
    expect(calculateFundingNeeded(200000, -100000, 6)).toBe(400000)
  })
})
