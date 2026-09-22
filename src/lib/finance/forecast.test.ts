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
    const points = calculateForecast(makeInputs(), { ...DEFAULT_FORECAST_CONFIG, salesCountGrowthPct: 5 })
    expect(points[11].revenue).toBeGreaterThan(points[0].revenue)
  })

  it('never produces NaN or Infinity values', () => {
    const points = calculateForecast(makeInputs(), DEFAULT_FORECAST_CONFIG, { months: 12 })
    for (const point of points) {
      expect(Number.isFinite(point.revenue)).toBe(true)
      expect(Number.isFinite(point.expenses)).toBe(true)
      expect(Number.isFinite(point.netProfit)).toBe(true)
      expect(Number.isFinite(point.cashFlow)).toBe(true)
      expect(Number.isFinite(point.cashBalance)).toBe(true)
    }
  })

  it('respects a custom number of months', () => {
    const points = calculateForecast(makeInputs(), DEFAULT_FORECAST_CONFIG, { months: 6 })
    expect(points).toHaveLength(6)
  })

  it('salesCountGrowthPct and avgCheckGrowthPct combine multiplicatively, not additively (each drives only its own factor)', () => {
    // +5% sales count and +3% avg check per month -> combined revenue growth per month is
    // (1.05 * 1.03 - 1) = 8.15%, not 5% and not 8% (naive sum) — this is now an honest,
    // visible composition of two independent drivers, not a hidden double-count bug.
    const base = makeInputs()
    const baseRevenue = base.avgCheck * base.salesCount // 850 * 2824 = 2,400,400 (the model's actual revenue basis)
    const points = calculateForecast(base, { ...DEFAULT_FORECAST_CONFIG, salesCountGrowthPct: 5, avgCheckGrowthPct: 3 })
    const month1Revenue = points[0].revenue
    const expectedMonth1Revenue = base.avgCheck * 1.03 * (base.salesCount * 1.05)
    expect(month1Revenue).toBeCloseTo(expectedMonth1Revenue, 2)
    expect(month1Revenue).toBeCloseTo(baseRevenue * 1.05 * 1.03, 0)
  })

  it('salesCountGrowthPct alone does not silently get amplified by avg check drift', () => {
    const base = makeInputs()
    const baseRevenue = base.avgCheck * base.salesCount
    const points = calculateForecast(base, { ...DEFAULT_FORECAST_CONFIG, salesCountGrowthPct: 5, avgCheckGrowthPct: 0 })
    // With avgCheckGrowthPct at 0, revenue growth should track salesCount growth exactly (5%/mo).
    expect(points[0].revenue).toBeCloseTo(baseRevenue * 1.05, 0)
  })

  it('cashBalance is cumulative and starts from openingCash, not just the sum of monthly cash flow mislabeled as "ending cash"', () => {
    const points = calculateForecast(makeInputs(), DEFAULT_FORECAST_CONFIG, { openingCash: 350000 })
    const netCashFlowSum = points.reduce((s, p) => s + p.cashFlow, 0)
    expect(points[points.length - 1].cashBalance).toBeCloseTo(350000 + netCashFlowSum, 2)
    // cashBalance accumulates monotonically with cashFlow, point by point
    let running = 350000
    for (const p of points) {
      running += p.cashFlow
      expect(p.cashBalance).toBeCloseTo(running, 2)
    }
  })

  it('defaults openingCash to 0 when not provided', () => {
    const points = calculateForecast(makeInputs(), DEFAULT_FORECAST_CONFIG)
    expect(points[0].cashBalance).toBeCloseTo(points[0].cashFlow, 2)
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
