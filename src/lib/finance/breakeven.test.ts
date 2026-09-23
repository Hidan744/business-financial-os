import { describe, expect, it } from 'vitest'
import {
  calculateAllowedCAC,
  calculateBreakEvenRevenue,
  calculateBreakEvenSales,
  calculateRequiredRevenue,
  calculateRequiredRevenueForNetProfit,
  calculateRequiredSales,
  calculateSafetyMarginPct,
  calculateWithdrawableAmount,
} from './breakeven'
import { buildFinancialSnapshot } from './snapshot'
import { estimateTaxForProjection } from './tax'
import type { FinancialInputs } from '@/types/finance'
import { DEFAULT_TAX_SETTINGS } from '@/types/tax'

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
    const result = calculateAllowedCAC(5000, 0.4, 500000, 400)
    expect(result.status).toBe('ok')
    expect(result.cac).toBe(750)
  })

  it('reports target_unreachable instead of clamping a negative CAC to zero', () => {
    // contribution per sale = 1000*0.1 = 100; profit per sale = 500000/10 = 50000 -> cac would be -49900
    const result = calculateAllowedCAC(1000, 0.1, 500000, 10)
    expect(result.status).toBe('target_unreachable')
    expect(result.cac).toBeNull()
  })

  it('reports insufficient_data when required sales is zero (division by zero guard)', () => {
    const result = calculateAllowedCAC(1000, 0.3, 100, 0)
    expect(result.status).toBe('insufficient_data')
    expect(result.cac).toBeNull()
  })

  it('reports insufficient_data when contribution margin is unusable', () => {
    const result = calculateAllowedCAC(1000, null, 100, 50)
    expect(result.status).toBe('insufficient_data')
    expect(result.cac).toBeNull()
  })
})

describe('calculateRequiredRevenueForNetProfit', () => {
  function baseInputs(overrides: Partial<FinancialInputs> = {}): FinancialInputs {
    return {
      businessId: 'b1',
      period: '2026-09',
      revenue: 2000000,
      cogs: 600000, // 30% of revenue
      payroll: 400000,
      rent: 150000,
      marketing: 100000,
      logistics: 50000,
      utilities: 20000,
      software: 10000,
      customExpenseLines: [],
      depreciation: 30000,
      loanInterest: 20000,
      taxes: 0,
      loanPayments: 0,
      avgCheck: 2000,
      salesCount: 1000,
      ...overrides,
    }
  }

  // TEST 1 (spec §30): target net profit is actually reached when the solved revenue is run
  // back through the real P&L (buildFinancialSnapshot) — the single source of truth.
  it('finds a revenue whose real Net Profit (via buildFinancialSnapshot) matches the target within 1 ₽', () => {
    const base = baseInputs()
    const fixedCosts = base.payroll + base.rent + base.marketing + base.logistics + base.utilities + base.software
    const variableCostRatio = base.cogs / base.revenue
    const targetNetProfit = 500000

    const result = calculateRequiredRevenueForNetProfit(
      targetNetProfit,
      fixedCosts,
      variableCostRatio,
      base.depreciation,
      base.loanInterest,
      base.avgCheck,
      { taxSettings: DEFAULT_TAX_SETTINGS },
    )

    expect(result.status).toBe('ok')
    expect(result.requiredRevenue).not.toBeNull()

    const revenue = result.requiredRevenue!
    const projected = baseInputs({
      revenue,
      cogs: revenue * variableCostRatio,
      taxes: (() => {
        // Re-derive the exact tax the solver used, the same way it did internally, so the
        // check below exercises the real, single P&L engine end-to-end.
        const variableCosts = revenue * variableCostRatio
        const ebitda = revenue - variableCosts - fixedCosts
        const ebit = ebitda - base.depreciation
        return estimateTaxForProjection(revenue, variableCosts + fixedCosts, ebit, { taxSettings: DEFAULT_TAX_SETTINGS })
      })(),
    })
    const snapshot = buildFinancialSnapshot(projected)
    expect(Math.abs(snapshot.netProfit - targetNetProfit)).toBeLessThan(1)
  })

  // TEST 2 (spec §30): impossible target -> null + target_unreachable, never a misleading number.
  it('reports target_unreachable when contribution margin cannot cover costs, regardless of revenue', () => {
    const result = calculateRequiredRevenueForNetProfit(
      500000,
      300000,
      1.1, // variable costs exceed revenue -> negative contribution margin
      0,
      0,
      1000,
      {},
    )
    expect(result.status).toBe('target_unreachable')
    expect(result.requiredRevenue).toBeNull()
    expect(result.requiredSales).toBeNull()
  })

  it('accounts for depreciation and interest, unlike the plain contribution-level calculateRequiredRevenue', () => {
    const fixedCosts = 300000
    const variableCostRatio = 0.3
    const target = 200000

    const withoutDepreciationInterest = calculateRequiredRevenueForNetProfit(target, fixedCosts, variableCostRatio, 0, 0, 1000, {})
    const withDepreciationInterest = calculateRequiredRevenueForNetProfit(target, fixedCosts, variableCostRatio, 100000, 50000, 1000, {})

    expect(withDepreciationInterest.requiredRevenue!).toBeGreaterThan(withoutDepreciationInterest.requiredRevenue!)
  })

  it('falls back to a flat effective tax rate on revenue when no tax regime is provided', () => {
    const result = calculateRequiredRevenueForNetProfit(100000, 200000, 0.4, 0, 0, 1000, {
      fallbackRatePctOfRevenue: 0.06,
    })
    expect(result.status).toBe('ok')
    // Net profit at the solved revenue should match target within tolerance, using the same flat rate.
    const revenue = result.requiredRevenue!
    const ebitda = revenue * 0.6 - 200000
    const tax = revenue * 0.06
    expect(Math.abs(ebitda - tax - 100000)).toBeLessThan(1)
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
