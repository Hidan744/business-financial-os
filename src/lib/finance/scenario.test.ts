import { describe, expect, it } from 'vitest'
import type { FinancialInputs } from '@/types/finance'
import { calculateScenario } from './scenario'
import { DEFAULT_MULTIPLIERS } from '@/types/scenario'

function makeInputs(): FinancialInputs {
  return {
    businessId: 'b1',
    period: '2026-09',
    revenue: 100000,
    cogs: 30000,
    payroll: 20000,
    rent: 10000,
    marketing: 5000,
    logistics: 0,
    utilities: 0,
    software: 0,
    customExpenseLines: [],
    depreciation: 0,
    loanInterest: 0,
    taxes: 5000,
    loanPayments: 0,
    avgCheck: 1000,
    salesCount: 100,
  }
}

describe('calculateScenario', () => {
  it('returns identical inputs when multipliers are all 1', () => {
    const result = calculateScenario(makeInputs(), DEFAULT_MULTIPLIERS)
    expect(result.revenue).toBe(100000)
    expect(result.salesCount).toBe(100)
  })

  it('recomputes revenue from avgCheck * salesCount to stay consistent', () => {
    const result = calculateScenario(makeInputs(), {
      ...DEFAULT_MULTIPLIERS,
      avgCheck: 1.1,
      salesCount: 1.2,
    })
    expect(result.avgCheck).toBeCloseTo(1100)
    expect(result.salesCount).toBeCloseTo(120)
    expect(result.revenue).toBeCloseTo(1100 * 120)
  })

  it('applies cost multipliers independently', () => {
    const result = calculateScenario(makeInputs(), { ...DEFAULT_MULTIPLIERS, marketing: 1.3 })
    expect(result.marketing).toBeCloseTo(6500)
  })
})
