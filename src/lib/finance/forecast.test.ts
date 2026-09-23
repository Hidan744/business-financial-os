import { describe, expect, it } from 'vitest'
import type { BalanceSheetInputs, FinancialInputs } from '@/types/finance'
import { calculateAverageMonthlyGrowthRatePct, calculateForecast, findCashFlowGap } from './forecast'
import { DEFAULT_FORECAST_CONFIG } from '@/types/scenario'
import type { MonthlyForecastPoint } from '@/types/scenario'
import { DEFAULT_TAX_SETTINGS } from '@/types/tax'
import { emptyBalanceSheet } from './balanceSheet'

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

  // TEST 8 (spec §30): Revenue up -> tax must be recomputed, not frozen at the base amount.
  describe('tax is recomputed per period, not copied from the base period', () => {
    it('scales tax with revenue by the effective current rate when no tax regime is given', () => {
      const base = makeInputs() // taxes 90000 on revenue 2400000 -> 3.75% effective rate
      const points = calculateForecast(base, { ...DEFAULT_FORECAST_CONFIG, salesCountGrowthPct: 10, avgCheckGrowthPct: 0 })
      // netProfit = revenue - cogs - fixedCosts - depreciation(0) - interest(0) - tax
      const fixedCosts = base.payroll + base.rent + base.marketing
      const cogsRatio = base.cogs / base.revenue
      const effectiveRate = base.taxes / base.revenue
      const point = points[0]
      const impliedTax = point.revenue - point.revenue * cogsRatio - fixedCosts - point.netProfit
      expect(impliedTax).toBeCloseTo(point.revenue * effectiveRate, 2)
      // and NOT frozen at the base period's absolute tax amount
      expect(impliedTax).not.toBeCloseTo(base.taxes, 0)
    })

    it('computes tax through the real tax engine when taxSettings (regime) is provided', () => {
      const base = makeInputs()
      const points = calculateForecast(base, { ...DEFAULT_FORECAST_CONFIG, salesCountGrowthPct: 10 }, { taxSettings: DEFAULT_TAX_SETTINGS })
      // DEFAULT_TAX_SETTINGS regime is usn_income_minus_expenses: tax = max((rev-exp)*rate, rev*1%)
      const point = points[0]
      const cogsRatio = base.cogs / base.revenue
      const cogs = point.revenue * cogsRatio
      const fixedCosts = base.payroll + base.rent + base.marketing
      const expenses = cogs + fixedCosts
      const calculated = Math.max(0, point.revenue - expenses) * (DEFAULT_TAX_SETTINGS.usnIncomeMinusExpensesRatePct / 100)
      const minimumTax = point.revenue * 0.01
      const expectedTax = Math.max(calculated, minimumTax)
      const impliedTax = point.revenue - expenses - point.netProfit
      expect(impliedTax).toBeCloseTo(expectedTax, 2)
    })
  })

  // TEST 7 (spec §30): growing AR (via DSO on rising revenue) should reduce cash flow vs the
  // no-working-capital baseline; the reverse for AP (DPO) freeing up cash.
  describe('incremental working capital drags on cash flow when a balance sheet is provided', () => {
    function balance(overrides: Partial<BalanceSheetInputs> = {}): BalanceSheetInputs {
      return {
        ...emptyBalanceSheet('b1', '2026-09'),
        currentAssets: { cash: 500000, receivables: 200000, inventory: 150000, other: 0 },
        currentLiabilities: { payables: 100000, shortTermDebt: 0, other: 0 },
        ...overrides,
      }
    }

    it('a growing forecast consumes more cash when working capital (AR/inventory growth) is modeled', () => {
      const base = makeInputs()
      const config = { ...DEFAULT_FORECAST_CONFIG, salesCountGrowthPct: 8, avgCheckGrowthPct: 0 }
      const withoutWC = calculateForecast(base, config)
      const withWC = calculateForecast(base, config, { balanceSheet: balance() })
      // Same net profit (working capital never touches the P&L)...
      expect(withWC[5].netProfit).toBeCloseTo(withoutWC[5].netProfit, 2)
      // ...but less cash generated, because growing AR/inventory ties up money.
      expect(withWC[5].cashBalance).toBeLessThan(withoutWC[5].cashBalance)
    })

    it('never produces NaN/Infinity when working capital is modeled', () => {
      const points = calculateForecast(makeInputs(), DEFAULT_FORECAST_CONFIG, { balanceSheet: balance() })
      for (const point of points) {
        expect(Number.isFinite(point.cashFlow)).toBe(true)
        expect(Number.isFinite(point.cashBalance)).toBe(true)
      }
    })
  })
})

describe('findCashFlowGap', () => {
  function point(overrides: Partial<MonthlyForecastPoint> = {}): MonthlyForecastPoint {
    return {
      monthIndex: 0,
      label: 'Янв',
      revenue: 100000,
      expenses: 80000,
      netProfit: 20000,
      cashFlow: 20000,
      cashBalance: 20000,
      ...overrides,
    }
  }

  it('returns null when cash balance never goes negative', () => {
    const points = [point({ monthIndex: 0, cashBalance: 10000 }), point({ monthIndex: 1, cashBalance: 5000 }), point({ monthIndex: 2, cashBalance: 15000 })]
    expect(findCashFlowGap(points)).toBeNull()
  })

  it('returns null for an empty forecast', () => {
    expect(findCashFlowGap([])).toBeNull()
  })

  it('finds the first month where cash balance goes negative, with a positive shortfall', () => {
    const points = [
      point({ monthIndex: 0, label: 'Янв', cashBalance: 50000 }),
      point({ monthIndex: 1, label: 'Фев', cashBalance: 10000 }),
      point({ monthIndex: 2, label: 'Мар', cashBalance: -30000 }),
      point({ monthIndex: 3, label: 'Апр', cashBalance: -60000 }),
    ]
    const gap = findCashFlowGap(points)
    expect(gap).not.toBeNull()
    expect(gap?.monthIndex).toBe(2)
    expect(gap?.period).toBe('Мар')
    expect(gap?.shortfall).toBe(30000)
  })

  it('does not flag a month that recovers to positive after a temporary dip below zero elsewhere', () => {
    // Only the FIRST negative month matters — once cash actually goes negative, everything
    // after it is a moot point for "when do we run out of money", even if it later recovers.
    const points = [
      point({ monthIndex: 0, cashBalance: 5000 }),
      point({ monthIndex: 1, cashBalance: -1000 }),
      point({ monthIndex: 2, cashBalance: 8000 }),
    ]
    const gap = findCashFlowGap(points)
    expect(gap?.monthIndex).toBe(1)
    expect(gap?.shortfall).toBe(1000)
  })

  it('treats exactly zero cash balance as not a gap (only strictly negative counts)', () => {
    const points = [point({ monthIndex: 0, cashBalance: 0 })]
    expect(findCashFlowGap(points)).toBeNull()
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
