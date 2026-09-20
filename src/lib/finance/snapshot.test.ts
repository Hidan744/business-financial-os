import { describe, expect, it } from 'vitest'
import type { FinancialInputs } from '@/types/finance'
import { buildFinancialSnapshot, getFixedCosts } from './snapshot'

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

describe('getFixedCosts', () => {
  it('sums payroll, rent, marketing, logistics, utilities, software and custom lines', () => {
    expect(getFixedCosts(makeInputs())).toBe(520000 + 220000 + 150000 + 180000)
  })
})

describe('buildFinancialSnapshot — Urban Coffee demo data', () => {
  it('computes a consistent snapshot without NaN/Infinity', () => {
    const snapshot = buildFinancialSnapshot(makeInputs())
    for (const value of Object.values(snapshot)) {
      expect(Number.isFinite(value)).toBe(true)
    }
    expect(snapshot.grossProfit).toBe(2400000 - 720000)
    expect(snapshot.netProfit).toBeGreaterThan(0)
  })
})

describe('buildFinancialSnapshot — edge cases', () => {
  it('handles zero revenue without throwing or producing NaN', () => {
    const snapshot = buildFinancialSnapshot(makeInputs({ revenue: 0, salesCount: 0 }))
    expect(Number.isFinite(snapshot.grossMarginPct)).toBe(true)
    expect(snapshot.grossMarginPct).toBe(0)
    expect(Number.isFinite(snapshot.breakEvenRevenue)).toBe(true)
  })

  it('handles negative net profit (loss-making business)', () => {
    const snapshot = buildFinancialSnapshot(makeInputs({ revenue: 500000 }))
    expect(snapshot.netProfit).toBeLessThan(0)
    expect(Number.isFinite(snapshot.netMarginPct)).toBe(true)
  })

  it('handles zero avgCheck without dividing by zero', () => {
    const snapshot = buildFinancialSnapshot(makeInputs({ avgCheck: 0 }))
    expect(snapshot.breakEvenSales).toBe(0)
  })
})
