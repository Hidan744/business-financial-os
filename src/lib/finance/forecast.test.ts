import { describe, expect, it } from 'vitest'
import type { FinancialInputs } from '@/types/finance'
import { calculateForecast } from './forecast'
import { DEFAULT_FORECAST_CONFIG } from '@/types/scenario'

function makeInputs(): FinancialInputs {
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
    customExpenseLines: [],
    depreciation: 0,
    loanInterest: 0,
    taxes: 90000,
    loanPayments: 50000,
    avgCheck: 850,
    salesCount: 2824,
  }
}

describe('calculateForecast', () => {
  it('produces 12 monthly points by default', () => {
    const points = calculateForecast(makeInputs(), DEFAULT_FORECAST_CONFIG)
    expect(points).toHaveLength(12)
  })

  it('grows revenue month over month with positive growth rate', () => {
    const points = calculateForecast(makeInputs(), { ...DEFAULT_FORECAST_CONFIG, monthlyGrowthRatePct: 5 })
    expect(points[11].revenue).toBeGreaterThan(points[0].revenue)
  })

  it('never produces NaN or Infinity values', () => {
    const points = calculateForecast(makeInputs(), DEFAULT_FORECAST_CONFIG, { months: 12 })
    for (const point of points) {
      expect(Number.isFinite(point.revenue)).toBe(true)
      expect(Number.isFinite(point.expenses)).toBe(true)
      expect(Number.isFinite(point.netProfit)).toBe(true)
      expect(Number.isFinite(point.cashFlow)).toBe(true)
    }
  })

  it('respects a custom number of months', () => {
    const points = calculateForecast(makeInputs(), DEFAULT_FORECAST_CONFIG, { months: 6 })
    expect(points).toHaveLength(6)
  })
})
