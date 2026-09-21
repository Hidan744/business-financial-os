import { describe, expect, it } from 'vitest'
import type { FinancialInputs } from '@/types/finance'
import { calculateAverageMonthlyGrowthRatePct, calculateForecast } from './forecast'
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

describe('calculateAverageMonthlyGrowthRatePct', () => {
  function record(period: string, revenue: number): FinancialInputs {
    return { ...makeInputs(), period, revenue }
  }

  it('returns null with fewer than two periods', () => {
    expect(calculateAverageMonthlyGrowthRatePct([record('2026-06', 1000)])).toBeNull()
    expect(calculateAverageMonthlyGrowthRatePct([])).toBeNull()
  })

  it('returns null when the first period has zero revenue', () => {
    expect(calculateAverageMonthlyGrowthRatePct([record('2026-06', 0), record('2026-07', 1000)])).toBeNull()
  })

  it('computes CAGR between first and last period', () => {
    // 1000 -> 1210 over 2 intervals => 10% per month
    const rate = calculateAverageMonthlyGrowthRatePct([record('2026-06', 1000), record('2026-07', 1100), record('2026-08', 1210)])
    expect(rate).toBeCloseTo(10, 5)
  })

  it('returns a negative rate for declining revenue', () => {
    const rate = calculateAverageMonthlyGrowthRatePct([record('2026-06', 1000), record('2026-07', 900)])
    expect(rate).toBeLessThan(0)
  })
})
