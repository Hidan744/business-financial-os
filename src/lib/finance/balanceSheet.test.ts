import { describe, expect, it } from 'vitest'
import type { BalanceSheetInputs } from '@/types/finance'
import {
  buildBalanceSheetSnapshot,
  calculateIncrementalWorkingCapital,
  calculateWorkingCapitalMetrics,
  emptyBalanceSheet,
  reconcileCashWithBalanceSheet,
} from './balanceSheet'

function makeInputs(overrides: Partial<BalanceSheetInputs> = {}): BalanceSheetInputs {
  return {
    businessId: 'b1',
    period: '2026-09',
    currentAssets: { cash: 645000, receivables: 100000, inventory: 150000, other: 0 },
    nonCurrentAssets: { fixedAssets: 800000, other: 0 },
    currentLiabilities: { payables: 200000, shortTermDebt: 50000, other: 0 },
    nonCurrentLiabilities: { longTermDebt: 300000, other: 0 },
    ...overrides,
  }
}

describe('emptyBalanceSheet', () => {
  it('creates a zeroed balance sheet for the given business and period', () => {
    const empty = emptyBalanceSheet('b1', '2026-09')
    const snapshot = buildBalanceSheetSnapshot(empty)
    expect(snapshot.totalAssets).toBe(0)
    expect(snapshot.totalLiabilities).toBe(0)
    expect(snapshot.equity).toBe(0)
  })
})

describe('buildBalanceSheetSnapshot', () => {
  it('sums assets and liabilities correctly', () => {
    const snapshot = buildBalanceSheetSnapshot(makeInputs())
    expect(snapshot.totalCurrentAssets).toBe(895000)
    expect(snapshot.totalNonCurrentAssets).toBe(800000)
    expect(snapshot.totalAssets).toBe(1695000)
    expect(snapshot.totalCurrentLiabilities).toBe(250000)
    expect(snapshot.totalNonCurrentLiabilities).toBe(300000)
    expect(snapshot.totalLiabilities).toBe(550000)
  })

  it('computes equity as assets minus liabilities (never entered directly)', () => {
    const snapshot = buildBalanceSheetSnapshot(makeInputs())
    expect(snapshot.equity).toBe(1695000 - 550000)
  })

  it('computes working capital as current assets minus current liabilities', () => {
    const snapshot = buildBalanceSheetSnapshot(makeInputs())
    expect(snapshot.workingCapital).toBe(895000 - 250000)
  })

  it('computes current ratio, and returns null when there are no current liabilities', () => {
    const snapshot = buildBalanceSheetSnapshot(makeInputs())
    expect(snapshot.currentRatio).toBeCloseTo(895000 / 250000, 5)

    const noCurrentLiabilities = buildBalanceSheetSnapshot(
      makeInputs({ currentLiabilities: { payables: 0, shortTermDebt: 0, other: 0 } }),
    )
    expect(noCurrentLiabilities.currentRatio).toBeNull()
  })

  it('computes debt-to-equity from INTEREST-BEARING debt only (not payables), and null when equity is not positive', () => {
    const snapshot = buildBalanceSheetSnapshot(makeInputs())
    // interest-bearing debt = shortTermDebt 50000 + longTermDebt 300000 = 350000 (payables 200000 excluded)
    expect(snapshot.interestBearingDebt).toBe(350000)
    expect(snapshot.debtToEquity).toBeCloseTo(350000 / 1145000, 5)

    const insolvent = buildBalanceSheetSnapshot(
      makeInputs({ nonCurrentLiabilities: { longTermDebt: 5000000, other: 0 } }),
    )
    expect(insolvent.equity).toBeLessThan(0)
    expect(insolvent.debtToEquity).toBeNull()
  })

  it('computes liabilities-to-equity from ALL liabilities (including payables) — a distinct, wider metric than debt-to-equity', () => {
    const snapshot = buildBalanceSheetSnapshot(makeInputs())
    expect(snapshot.liabilitiesToEquity).toBeCloseTo(550000 / 1145000, 5)
    // liabilitiesToEquity > debtToEquity whenever there's non-debt liabilities (payables here)
    expect(snapshot.liabilitiesToEquity).toBeGreaterThan(snapshot.debtToEquity ?? 0)

    const insolvent = buildBalanceSheetSnapshot(
      makeInputs({ nonCurrentLiabilities: { longTermDebt: 5000000, other: 0 } }),
    )
    expect(insolvent.liabilitiesToEquity).toBeNull()
  })

  it('a business with payables but zero loans has debtToEquity 0 while liabilitiesToEquity is still positive', () => {
    const snapshot = buildBalanceSheetSnapshot(
      makeInputs({
        currentLiabilities: { payables: 200000, shortTermDebt: 0, other: 0 },
        nonCurrentLiabilities: { longTermDebt: 0, other: 0 },
      }),
    )
    expect(snapshot.interestBearingDebt).toBe(0)
    expect(snapshot.debtToEquity).toBe(0)
    expect(snapshot.liabilitiesToEquity).toBeGreaterThan(0)
  })

  it('computes the equity ratio (%), and returns null when there are no assets', () => {
    const snapshot = buildBalanceSheetSnapshot(makeInputs())
    expect(snapshot.equityRatioPct).toBeCloseTo((1145000 / 1695000) * 100, 5)

    const noAssets = buildBalanceSheetSnapshot(emptyBalanceSheet('b1', '2026-09'))
    expect(noAssets.equityRatioPct).toBeNull()
  })
})

describe('calculateWorkingCapitalMetrics', () => {
  it('computes DSO, DPO, DIO and the cash conversion cycle', () => {
    // receivables 120000, revenue 2400000 -> DSO = 120000/2400000*30 = 1.5
    // payables 210000, cogs 720000 -> DPO = 210000/720000*30 = 8.75
    // inventory 180000, cogs 720000 -> DIO = 180000/720000*30 = 7.5
    const metrics = calculateWorkingCapitalMetrics(120000, 210000, 180000, 2400000, 720000, 30)
    expect(metrics.dso).toBeCloseTo(1.5, 5)
    expect(metrics.dpo).toBeCloseTo(8.75, 5)
    expect(metrics.dio).toBeCloseTo(7.5, 5)
    expect(metrics.cashConversionCycleDays).toBeCloseTo(1.5 + 7.5 - 8.75, 5)
  })

  it('returns null for DSO when revenue is zero, and for DPO/DIO when cogs is zero', () => {
    const metrics = calculateWorkingCapitalMetrics(100000, 50000, 60000, 0, 0)
    expect(metrics.dso).toBeNull()
    expect(metrics.dpo).toBeNull()
    expect(metrics.dio).toBeNull()
    expect(metrics.cashConversionCycleDays).toBeNull()
  })

  it('uses the average of beginning and ending balances when a previous period is given', () => {
    // Ending: receivables 120000, payables 210000, inventory 180000 (same as the no-history case above).
    // Beginning (previous period): receivables 80000, payables 190000, inventory 120000.
    // Averages: receivables 100000, payables 200000, inventory 150000.
    const metrics = calculateWorkingCapitalMetrics(120000, 210000, 180000, 2400000, 720000, 30, {
      receivables: 80000,
      payables: 190000,
      inventory: 120000,
    })
    expect(metrics.dso).toBeCloseTo((100000 / 2400000) * 30, 5)
    expect(metrics.dpo).toBeCloseTo((200000 / 720000) * 30, 5)
    expect(metrics.dio).toBeCloseTo((150000 / 720000) * 30, 5)
  })

  it('falls back to the ending balance alone when no previous period is available (first period ever)', () => {
    const withHistory = calculateWorkingCapitalMetrics(120000, 210000, 180000, 2400000, 720000, 30, {
      receivables: 120000,
      payables: 210000,
      inventory: 180000,
    })
    const withoutHistory = calculateWorkingCapitalMetrics(120000, 210000, 180000, 2400000, 720000, 30)
    // Previous == current here, so the average equals the ending balance either way.
    expect(withoutHistory.dso).toBeCloseTo(withHistory.dso as number, 5)
    expect(withoutHistory.dpo).toBeCloseTo(withHistory.dpo as number, 5)
    expect(withoutHistory.dio).toBeCloseTo(withHistory.dio as number, 5)
  })
})

describe('calculateIncrementalWorkingCapital', () => {
  it('returns null when current turnover ratios are not defined', () => {
    const metrics = calculateWorkingCapitalMetrics(100000, 50000, 60000, 0, 0)
    expect(calculateIncrementalWorkingCapital(0, 0, 1000000, 300000, metrics)).toBeNull()
  })

  it('computes additional receivables + inventory - additional payables scaled by turnover days', () => {
    // Current: revenue 2.4M, cogs 720k -> DSO 1.5d, DIO 7.5d, DPO 8.75d (from the case above)
    const metrics = calculateWorkingCapitalMetrics(120000, 210000, 180000, 2400000, 720000, 30)
    // Growing revenue 2.4M -> 3.6M (delta 1.2M), cogs 720k -> 1.08M (delta 360k)
    const additional = calculateIncrementalWorkingCapital(2400000, 720000, 3600000, 1080000, metrics, 30)
    const expectedReceivables = (1200000 / 30) * 1.5
    const expectedInventory = (360000 / 30) * 7.5
    const expectedPayables = (360000 / 30) * 8.75
    expect(additional).toBeCloseTo(expectedReceivables + expectedInventory - expectedPayables, 5)
    expect(additional).toBeGreaterThan(0) // growth ties up more cash than it frees from supplier credit here
  })

  it('is zero when projected figures equal current figures (no growth, no extra working capital needed)', () => {
    const metrics = calculateWorkingCapitalMetrics(120000, 210000, 180000, 2400000, 720000, 30)
    expect(calculateIncrementalWorkingCapital(2400000, 720000, 2400000, 720000, metrics)).toBeCloseTo(0, 5)
  })

  it('can be negative when revenue shrinks (working capital is released, not consumed)', () => {
    const metrics = calculateWorkingCapitalMetrics(120000, 210000, 180000, 2400000, 720000, 30)
    const released = calculateIncrementalWorkingCapital(2400000, 720000, 1200000, 360000, metrics, 30)
    expect(released).toBeLessThan(0)
  })
})

describe('reconcileCashWithBalanceSheet', () => {
  it('is not significant when cash flow closing balance and balance sheet cash match exactly', () => {
    const result = reconcileCashWithBalanceSheet(645000, 645000)
    expect(result.gap).toBe(0)
    expect(result.isSignificant).toBe(false)
  })

  it('tolerates only rounding noise, not a percentage of the balance', () => {
    const small = reconcileCashWithBalanceSheet(645000, 645050)
    expect(small.isSignificant).toBe(false)

    // A 1% gap on a large balance would pass a percentage-based check, but cash flow and
    // balance sheet describe the exact same number, so any non-trivial gap is a real error.
    const large = reconcileCashWithBalanceSheet(645000, 651450)
    expect(large.gap).toBe(6450)
    expect(large.isSignificant).toBe(true)
  })

  it('reports the gap as balanceSheetCash minus cashFlowClosingBalance (sign matters for diagnosis)', () => {
    const result = reconcileCashWithBalanceSheet(500000, 470000)
    expect(result.gap).toBe(-30000)
    expect(result.isSignificant).toBe(true)
  })
})
