import { describe, expect, it } from 'vitest'
import type { FinancialInputs } from '@/types/finance'
import { buildExpenseBreakdown, buildHistoryTrend } from './reportCharts'

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
    customExpenseLines: [],
    depreciation: 0,
    loanInterest: 0,
    taxes: 90000,
    loanPayments: 50000,
    avgCheck: 850,
    salesCount: 2824,
    ...overrides,
  }
}

describe('buildExpenseBreakdown', () => {
  it('excludes zero-value categories', () => {
    const items = buildExpenseBreakdown(makeInputs())
    expect(items.every((i) => i.value > 0)).toBe(true)
    expect(items.find((i) => i.label === 'Логистика')).toBeUndefined()
  })

  it('sorts descending by value', () => {
    const items = buildExpenseBreakdown(makeInputs())
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].value).toBeGreaterThanOrEqual(items[i].value)
    }
  })

  it('includes cogs, variableOpex and taxes alongside fixed cost lines', () => {
    const items = buildExpenseBreakdown(makeInputs({ variableOpex: 40000 }))
    expect(items.find((i) => i.label === 'Себестоимость')?.value).toBe(720000)
    expect(items.find((i) => i.label === 'Переменные операционные расходы')?.value).toBe(40000)
    expect(items.find((i) => i.label === 'Налоги')?.value).toBe(90000)
  })

  it('caps at 7 slots, folding the smallest tail into "Прочее"', () => {
    const items = buildExpenseBreakdown(
      makeInputs({
        variableOpex: 10000,
        logistics: 9000,
        utilities: 8000,
        software: 7000,
        depreciation: 6000,
        loanInterest: 5000,
        customExpenseLines: [{ id: '1', label: 'X', amount: 4000 }],
      }),
    )
    expect(items).toHaveLength(7)
    expect(items[items.length - 1].label).toBe('Прочее')
    // The smallest values (loanInterest 5000 + customExpenseLines 4000 + software 7000 folds in
    // depending on exact ranking) sum correctly regardless of which ones got folded.
    const total = items.reduce((s, i) => s + i.value, 0)
    const expectedTotal = 720000 + 10000 + 520000 + 220000 + 150000 + 9000 + 8000 + 7000 + 4000 + 6000 + 5000 + 90000
    expect(total).toBe(expectedTotal)
  })

  it('never produces more than 7 items regardless of how many cost lines are nonzero', () => {
    const items = buildExpenseBreakdown(
      makeInputs({
        variableOpex: 1,
        logistics: 1,
        utilities: 1,
        software: 1,
        depreciation: 1,
        loanInterest: 1,
        customExpenseLines: [{ id: '1', label: 'X', amount: 1 }],
      }),
    )
    expect(items.length).toBeLessThanOrEqual(7)
  })

  it('handles an all-zero-cost business without throwing (empty result, not NaN)', () => {
    const items = buildExpenseBreakdown(
      makeInputs({ cogs: 0, payroll: 0, rent: 0, marketing: 0, taxes: 0 }),
    )
    expect(items).toEqual([])
  })
})

describe('buildHistoryTrend', () => {
  it('appends the current period after sorted history, in chronological order', () => {
    const h1 = makeInputs({ period: '2026-06', revenue: 2000000 })
    const h2 = makeInputs({ period: '2026-08', revenue: 2200000 })
    const current = makeInputs({ period: '2026-09', revenue: 2400000 })
    const trend = buildHistoryTrend([h2, h1], current) // deliberately out of order
    expect(trend.map((p) => p.period)).toEqual(['2026-06', '2026-08', '2026-09'])
    expect(trend.map((p) => p.revenue)).toEqual([2000000, 2200000, 2400000])
  })

  it('does not duplicate the current period if it already exists in history', () => {
    const current = makeInputs({ period: '2026-09', revenue: 2400000 })
    const trend = buildHistoryTrend([current], current)
    expect(trend).toHaveLength(1)
  })

  it('computes margin percentages per period, not just revenue/profit', () => {
    const current = makeInputs()
    const trend = buildHistoryTrend([], current)
    expect(trend).toHaveLength(1)
    expect(Number.isFinite(trend[0].grossMarginPct)).toBe(true)
    expect(Number.isFinite(trend[0].ebitdaMarginPct)).toBe(true)
    expect(Number.isFinite(trend[0].netMarginPct)).toBe(true)
  })

  it('works with an empty history (freelancer/new business with only the current period)', () => {
    const current = makeInputs()
    const trend = buildHistoryTrend([], current)
    expect(trend).toHaveLength(1)
    expect(trend[0].period).toBe('2026-09')
  })
})
