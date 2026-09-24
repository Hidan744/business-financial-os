import { describe, expect, it } from 'vitest'
import { DEFAULT_TAX_SETTINGS } from '@/types/tax'
import {
  calculateNpdTax,
  calculateOsnProfitTax,
  calculatePatentMonthlyCost,
  calculateTaxForRegime,
  calculateUsnIncomeMinusExpensesTax,
  calculateUsnIncomeTax,
  calculateVatPayable,
} from './tax'

describe('calculateUsnIncomeTax', () => {
  it('computes rate % of revenue', () => {
    expect(calculateUsnIncomeTax(2400000, 6)).toBe(144000)
  })
  it('clamps negative revenue to zero', () => {
    expect(calculateUsnIncomeTax(-1000, 6)).toBe(0)
  })
})

describe('calculateUsnIncomeMinusExpensesTax', () => {
  it('computes rate % of (revenue - expenses) when above the minimum tax', () => {
    // base = 2,400,000 - 1,790,000 = 610,000; 15% = 91,500; minimum tax = 24,000 -> use 91,500
    expect(calculateUsnIncomeMinusExpensesTax(2400000, 1790000, 15)).toBe(91500)
  })
  it('falls back to the 1% minimum tax when the calculated tax is lower (e.g. a loss-making period)', () => {
    // base = 0 (expenses exceed revenue) -> calculated = 0; minimum tax = 1% of 2,400,000 = 24,000
    expect(calculateUsnIncomeMinusExpensesTax(2400000, 3000000, 15)).toBe(24000)
  })
})

describe('calculatePatentMonthlyCost', () => {
  it('divides the annual cost by 12', () => {
    expect(calculatePatentMonthlyCost(120000)).toBe(10000)
  })
  it('clamps negative cost to zero', () => {
    expect(calculatePatentMonthlyCost(-1000)).toBe(0)
  })
})

describe('calculateNpdTax', () => {
  it('computes rate % of revenue', () => {
    expect(calculateNpdTax(200000, 4)).toBe(8000)
    expect(calculateNpdTax(200000, 6)).toBe(12000)
  })
})

describe('calculateOsnProfitTax', () => {
  it('computes rate % of EBIT', () => {
    expect(calculateOsnProfitTax(610000, 20)).toBe(122000)
  })
  it('is zero when EBIT is negative (no tax on a loss)', () => {
    expect(calculateOsnProfitTax(-50000, 20)).toBe(0)
  })
})

describe('calculateVatPayable', () => {
  it('nets output VAT against input VAT at the inclusive rate', () => {
    // revenue and expenses are VAT-inclusive; 20% -> factor 1/6.
    // output = 1,200,000/6 = 200,000; input = 600,000/6 = 100,000 -> payable 100,000.
    expect(calculateVatPayable(1200000, 600000, 20)).toBeCloseTo(100000)
  })

  it('returns a negative amount (overpayment) when deductible expenses exceed revenue', () => {
    expect(calculateVatPayable(600000, 1200000, 20)).toBeCloseTo(-100000)
  })

  it('is zero at a 0% rate regardless of amounts', () => {
    expect(calculateVatPayable(1200000, 300000, 0)).toBe(0)
  })

  it('clamps negative revenue and expenses to zero before computing', () => {
    expect(calculateVatPayable(-1000, -500, 20)).toBe(0)
  })
})

describe('calculateTaxForRegime', () => {
  const params = { revenue: 2400000, expenses: 1790000, ebit: 610000 }

  it('dispatches to the right formula for each regime', () => {
    expect(calculateTaxForRegime('usn_income', DEFAULT_TAX_SETTINGS, params).amount).toBe(144000)
    expect(calculateTaxForRegime('usn_income_minus_expenses', DEFAULT_TAX_SETTINGS, params).amount).toBe(91500)
    expect(calculateTaxForRegime('osn', DEFAULT_TAX_SETTINGS, params).amount).toBe(122000)
    expect(calculateTaxForRegime('npd', DEFAULT_TAX_SETTINGS, params).amount).toBe(144000)
    expect(calculateTaxForRegime('patent', { ...DEFAULT_TAX_SETTINGS, patentAnnualCost: 120000 }, params).amount).toBe(10000)
  })

  it('every regime returns an explanatory note', () => {
    const regimes = ['usn_income', 'usn_income_minus_expenses', 'osn', 'patent', 'npd'] as const
    for (const regime of regimes) {
      expect(calculateTaxForRegime(regime, DEFAULT_TAX_SETTINGS, params).note.length).toBeGreaterThan(0)
    }
  })
})
