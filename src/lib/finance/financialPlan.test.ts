import { describe, expect, it } from 'vitest'
import type { FinancialInputs } from '@/types/finance'
import { buildFinancialPlan } from './financialPlan'

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

describe('buildFinancialPlan', () => {
  it('returns empty result for a non-positive time horizon', () => {
    const plan = buildFinancialPlan(makeInputs(), 12000000, 0, 8)
    expect(plan.requiredMonthlyRevenue).toBeNull()
    expect(plan.monthlyPoints).toHaveLength(0)
    expect(plan.quarters).toHaveLength(0)
  })

  it('computes required monthly revenue from target annual profit and current cost structure', () => {
    // fixedCosts = 520000+220000+150000+180000 = 1,070,000; contributionMargin = (2.4M-720k)/2.4M = 0.7
    // monthly target = 12,000,000/12 = 1,000,000
    // requiredRevenue = (1,000,000 + 1,070,000) / 0.7
    const plan = buildFinancialPlan(makeInputs(), 12000000, 12, 8)
    expect(plan.requiredMonthlyRevenue).toBeCloseTo((1000000 + 1070000) / 0.7, 2)
    expect(plan.requiredMonthlySales).toBeCloseTo((plan.requiredMonthlyRevenue as number) / 850, 2)
  })

  it('is not "already achieved" when the target requires more revenue than today', () => {
    const plan = buildFinancialPlan(makeInputs(), 12000000, 12, 8)
    expect(plan.alreadyAchieved).toBe(false)
    expect(plan.requiredMonthlyGrowthRatePct).toBeGreaterThan(0)
  })

  it('flags alreadyAchieved and does not project further growth when the target is modest', () => {
    // Current net profit is well above a tiny target -> required revenue <= current revenue
    const plan = buildFinancialPlan(makeInputs(), 1, 12, 8)
    expect(plan.alreadyAchieved).toBe(true)
    // effective growth used for the projection is clamped to 0, not left negative
    expect(plan.monthlyPoints[0].revenue).toBeCloseTo(makeInputs().avgCheck * makeInputs().salesCount, 0)
  })

  it('returns null (not NaN/Infinity) when contribution margin is zero or negative', () => {
    const plan = buildFinancialPlan(makeInputs({ cogs: 2400000 }), 12000000, 12, 8)
    expect(plan.requiredMonthlyRevenue).toBeNull()
    expect(plan.requiredMonthlySales).toBeNull()
    expect(plan.requiredMonthlyGrowthRatePct).toBeNull()
    expect(plan.monthlyPoints).toHaveLength(0)
  })

  it('produces one monthly point per month in the horizon, grouped into quarters', () => {
    const plan = buildFinancialPlan(makeInputs(), 12000000, 12, 8)
    expect(plan.monthlyPoints).toHaveLength(12)
    expect(plan.quarters).toHaveLength(4)
    const monthlyRevenueSum = plan.monthlyPoints.reduce((s, p) => s + p.revenue, 0)
    const quarterlyRevenueSum = plan.quarters.reduce((s, q) => s + q.revenue, 0)
    expect(quarterlyRevenueSum).toBeCloseTo(monthlyRevenueSum, 5)
  })

  it('handles a horizon not divisible by 3 (partial last quarter) without dropping months', () => {
    const plan = buildFinancialPlan(makeInputs(), 12000000, 8, 8)
    expect(plan.monthlyPoints).toHaveLength(8)
    expect(plan.quarters).toHaveLength(3) // 3 + 3 + 2
    expect(plan.quarters[2].revenue).toBeCloseTo(plan.monthlyPoints[6].revenue + plan.monthlyPoints[7].revenue, 5)
  })

  it('reaches approximately the required revenue by the last month of the horizon', () => {
    const plan = buildFinancialPlan(makeInputs(), 12000000, 12, 8)
    const lastMonthRevenue = plan.monthlyPoints[plan.monthlyPoints.length - 1].revenue
    const required = plan.requiredMonthlyRevenue as number
    // Small drift is expected: the growth rate is solved from revenue (2.4M), but the forecast
    // engine compounds avgCheck x salesCount (2,400,400) — within 0.1% is "reaches the target".
    expect(Math.abs(lastMonthRevenue - required) / required).toBeLessThan(0.001)
  })

  it('never produces NaN or Infinity in monthly points', () => {
    const plan = buildFinancialPlan(makeInputs(), 12000000, 12, 8)
    for (const point of plan.monthlyPoints) {
      expect(Number.isFinite(point.revenue)).toBe(true)
      expect(Number.isFinite(point.netProfit)).toBe(true)
      expect(Number.isFinite(point.cashBalance)).toBe(true)
    }
  })
})
