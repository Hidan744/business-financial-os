import { describe, expect, it } from 'vitest'
import {
  calculateApproxCostPerSale,
  calculateDebtLoad,
  calculateDebtToEBITDA,
  calculateDSCR,
  calculateEBIT,
  calculateEBITDA,
  calculateEBITDAMargin,
  calculateEBITMargin,
  calculateGrossMargin,
  calculateGrossProfit,
  calculateNetMargin,
  calculateNetProfit,
  calculatePeriodGrowthPct,
  calculateROI,
  calculateROMI,
  calculateRevenuePerEmployee,
  calculateContributionMarginPct,
} from './formulas'

describe('calculateGrossProfit', () => {
  it('subtracts cogs from revenue', () => {
    expect(calculateGrossProfit(1000, 400)).toBe(600)
  })
  it('can be negative when cogs exceed revenue', () => {
    expect(calculateGrossProfit(100, 400)).toBe(-300)
  })
})

describe('calculateGrossMargin', () => {
  it('computes percentage', () => {
    expect(calculateGrossMargin(600, 1000)).toBe(60)
  })
  it('returns null when revenue is zero', () => {
    expect(calculateGrossMargin(0, 0)).toBeNull()
  })
  it('returns null when revenue is negative', () => {
    expect(calculateGrossMargin(100, -50)).toBeNull()
  })
})

describe('calculateEBITDA / calculateEBITDAMargin', () => {
  it('subtracts fixed costs from gross profit', () => {
    expect(calculateEBITDA(600, 400)).toBe(200)
  })
  it('margin returns null on zero revenue', () => {
    expect(calculateEBITDAMargin(200, 0)).toBeNull()
  })
})

describe('calculateEBIT / calculateEBITMargin', () => {
  it('subtracts depreciation from EBITDA', () => {
    expect(calculateEBIT(200, 30)).toBe(170)
  })
  it('margin returns null on zero revenue', () => {
    expect(calculateEBITMargin(170, 0)).toBeNull()
  })
  it('computes margin percentage', () => {
    expect(calculateEBITMargin(170, 1000)).toBe(17)
  })
})

describe('calculateNetProfit / calculateNetMargin', () => {
  it('subtracts depreciation, interest, taxes from EBITDA', () => {
    expect(calculateNetProfit(200, 20, 10, 30)).toBe(140)
  })
  it('net margin handles zero revenue', () => {
    expect(calculateNetMargin(140, 0)).toBeNull()
  })
  it('net profit can be negative', () => {
    expect(calculateNetProfit(50, 20, 10, 30)).toBe(-10)
  })
})

describe('calculateContributionMarginPct', () => {
  it('computes ratio between 0 and 1', () => {
    expect(calculateContributionMarginPct(1000, 400)).toBeCloseTo(0.6)
  })
  it('returns null for zero revenue (no division by zero)', () => {
    expect(calculateContributionMarginPct(0, 100)).toBeNull()
  })
  it('can be negative when variable costs exceed revenue', () => {
    expect(calculateContributionMarginPct(100, 500)).toBeCloseTo(-4)
  })
})

describe('calculateROI / calculateROMI', () => {
  it('ROI returns null when investment is zero', () => {
    expect(calculateROI(100, 0)).toBeNull()
  })
  it('ROI computes percentage', () => {
    expect(calculateROI(50, 200)).toBe(25)
  })
  it('ROMI returns null when marketing cost is zero', () => {
    expect(calculateROMI(1000, 0)).toBeNull()
  })
  it('ROMI computes percentage return over spend', () => {
    expect(calculateROMI(1500, 500)).toBe(200)
  })
})

describe('calculateDebtLoad', () => {
  it('returns null on zero revenue', () => {
    expect(calculateDebtLoad(1000, 0)).toBeNull()
  })
  it('computes percentage of revenue', () => {
    expect(calculateDebtLoad(100, 1000)).toBe(10)
  })
})

describe('calculateRevenuePerEmployee', () => {
  it('divides revenue by headcount', () => {
    expect(calculateRevenuePerEmployee(800000, 8)).toBe(100000)
  })
  it('returns null when there are no employees (division by zero guard)', () => {
    expect(calculateRevenuePerEmployee(800000, 0)).toBeNull()
  })
})

describe('calculateApproxCostPerSale', () => {
  it('divides marketing spend by sales count', () => {
    expect(calculateApproxCostPerSale(150000, 3000)).toBe(50)
  })
  it('returns null when there are no sales', () => {
    expect(calculateApproxCostPerSale(150000, 0)).toBeNull()
  })
})

describe('calculatePeriodGrowthPct', () => {
  it('computes percentage growth between two periods', () => {
    expect(calculatePeriodGrowthPct(2400000, 2300000)).toBeCloseTo(4.35, 1)
  })
  it('computes negative growth (decline)', () => {
    expect(calculatePeriodGrowthPct(1800000, 2000000)).toBeCloseTo(-10, 5)
  })
  it('returns null when the previous value is zero (division by zero guard)', () => {
    expect(calculatePeriodGrowthPct(1000, 0)).toBeNull()
  })
  it('handles a negative previous value using its absolute value as the base', () => {
    // прибыль выросла с -100 000 до 50 000 — рост в абсолютном выражении, а не "-150%"
    expect(calculatePeriodGrowthPct(50000, -100000)).toBeCloseTo(150, 5)
  })
})

describe('calculateDebtToEBITDA', () => {
  it('computes the ratio of annual debt to annual EBITDA', () => {
    expect(calculateDebtToEBITDA(1200000, 3000000)).toBeCloseTo(0.4, 5)
  })
  it('returns null when EBITDA is zero or negative (ratio would be meaningless/undefined)', () => {
    expect(calculateDebtToEBITDA(1200000, 0)).toBeNull()
    expect(calculateDebtToEBITDA(1200000, -500000)).toBeNull()
  })
})

describe('calculateDSCR', () => {
  it('computes how many times EBITDA covers debt service', () => {
    expect(calculateDSCR(300000, 200000)).toBe(1.5)
  })
  it('returns null when there is no debt service (division by zero guard)', () => {
    expect(calculateDSCR(300000, 0)).toBeNull()
  })
  it('can be below 1, signalling EBITDA does not cover debt payments', () => {
    expect(calculateDSCR(100000, 200000)).toBe(0.5)
  })
})
