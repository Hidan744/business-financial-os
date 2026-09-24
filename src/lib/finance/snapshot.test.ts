import { describe, expect, it } from 'vitest'
import type { FinancialInputs } from '@/types/finance'
import { buildFinancialSnapshot, getFixedCosts, getVariableCosts, getVatDeductibleExpenses } from './snapshot'

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
  it('computes a consistent snapshot without NaN/Infinity (null is allowed — it is the honest "unknown", never NaN)', () => {
    const snapshot = buildFinancialSnapshot(makeInputs())
    for (const value of Object.values(snapshot)) {
      expect(value === null || Number.isFinite(value)).toBe(true)
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

  it('debtToEbitda is null when no outstanding-debt context is given, even with healthy positive EBITDA', () => {
    const snapshot = buildFinancialSnapshot(makeInputs())
    expect(snapshot.ebitda).toBeGreaterThan(0)
    expect(snapshot.debtToEbitda).toBeNull()
  })

  it('debtToEbitda is null (not NaN/Infinity) when EBITDA is zero or negative, even with outstanding debt supplied', () => {
    const snapshot = buildFinancialSnapshot(makeInputs({ revenue: 100000, payroll: 900000 }), { outstandingDebt: 1000000 })
    expect(snapshot.ebitda).toBeLessThan(0)
    expect(snapshot.debtToEbitda).toBeNull()
  })

  it('debtToEbitda computes the real ratio once outstanding debt is supplied via context', () => {
    const snapshot = buildFinancialSnapshot(makeInputs(), { outstandingDebt: 500000 })
    // ebitda = 610000/mo -> annual 7,320,000; 500,000 / 7,320,000
    expect(snapshot.debtToEbitda).toBeCloseTo(500000 / (snapshot.ebitda * 12), 5)
  })

  it('dscr is null (not NaN/Infinity) when there is no debt service', () => {
    const snapshot = buildFinancialSnapshot(makeInputs({ loanPayments: 0, loanInterest: 0 }))
    expect(snapshot.dscr).toBeNull()
  })

  it('dscr is a finite number when there is debt service and positive EBITDA', () => {
    const snapshot = buildFinancialSnapshot(makeInputs())
    expect(snapshot.dscr).not.toBeNull()
    expect(Number.isFinite(snapshot.dscr)).toBe(true)
  })

  it('dscr accounts for taxes even without maintenanceCapex context (more conservative than raw EBITDA/debtService)', () => {
    const snapshot = buildFinancialSnapshot(makeInputs())
    const debtService = 50000 // loanPayments
    const naiveDscr = snapshot.ebitda / debtService
    expect(snapshot.dscr).toBeLessThan(naiveDscr)
  })

  it('dscr drops further when maintenanceCapex context is supplied', () => {
    const withoutCapex = buildFinancialSnapshot(makeInputs())
    const withCapex = buildFinancialSnapshot(makeInputs(), { maintenanceCapex: 100000 })
    expect(withCapex.dscr).toBeLessThan(withoutCapex.dscr as number)
  })

  it('romiPct/roas are null without attributedRevenue, and computed once it is set', () => {
    const withoutAttribution = buildFinancialSnapshot(makeInputs())
    expect(withoutAttribution.romiPct).toBeNull()
    expect(withoutAttribution.roas).toBeNull()

    const withAttribution = buildFinancialSnapshot(makeInputs({ attributedRevenue: 1500000 }))
    expect(withAttribution.romiPct).not.toBeNull()
    expect(withAttribution.roas).toBe(1500000 / 150000)
  })

  it('marketingEfficiencyPct (the old mislabeled formula) is always computable and clearly separate from romiPct', () => {
    const snapshot = buildFinancialSnapshot(makeInputs())
    expect(Number.isFinite(snapshot.marketingEfficiencyPct)).toBe(true)
    expect(snapshot.romiPct).toBeNull()
  })
})

describe('getVatDeductibleExpenses', () => {
  it('sums cogs, variableOpex, rent, marketing, logistics, utilities, software and custom lines', () => {
    expect(getVatDeductibleExpenses(makeInputs({ variableOpex: 80000 }))).toBe(720000 + 80000 + 220000 + 150000 + 180000)
  })

  it('excludes payroll, unlike getFixedCosts (salaries carry no VAT)', () => {
    const inputs = makeInputs()
    expect(getVatDeductibleExpenses(inputs)).toBeLessThan(getFixedCosts(inputs) + getVariableCosts(inputs))
    expect(getFixedCosts(inputs) + getVariableCosts(inputs) - getVatDeductibleExpenses(inputs)).toBe(inputs.payroll)
  })
})

describe('getVariableCosts / variableOpex', () => {
  it('getVariableCosts = cogs + variableOpex', () => {
    expect(getVariableCosts(makeInputs({ variableOpex: 80000 }))).toBe(720000 + 80000)
  })

  it('is backward compatible: records without variableOpex read it as 0', () => {
    const { variableOpex: _omit, ...withoutField } = makeInputs() as FinancialInputs & { variableOpex?: number }
    expect(getVariableCosts(withoutField as FinancialInputs)).toBe(720000)
  })

  it('contributionProfit = grossProfit - variableOpex, and does not affect fixedCosts', () => {
    const snapshot = buildFinancialSnapshot(makeInputs({ variableOpex: 80000 }))
    expect(snapshot.contributionProfit).toBe(snapshot.grossProfit - 80000)
    expect(snapshot.fixedCosts).toBe(getFixedCosts(makeInputs({ variableOpex: 80000 })))
  })

  it('ebitda = contributionProfit - fixedCosts (variableOpex sits between Gross Profit and EBITDA)', () => {
    const snapshot = buildFinancialSnapshot(makeInputs({ variableOpex: 80000 }))
    expect(snapshot.ebitda).toBeCloseTo(snapshot.contributionProfit - snapshot.fixedCosts, 5)
  })

  it('variableOpex reduces cash flow by the same amount (it is a real cash cost)', () => {
    const without = buildFinancialSnapshot(makeInputs({ variableOpex: 0 }))
    const withOpex = buildFinancialSnapshot(makeInputs({ variableOpex: 80000 }))
    expect(without.cashFlow - withOpex.cashFlow).toBeCloseTo(80000, 5)
  })
})
