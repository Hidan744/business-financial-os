import { describe, expect, it } from 'vitest'
import {
  calculateApproxCostPerSale,
  calculateCAC,
  calculateCPA,
  calculateDebtServiceRatio,
  calculateDebtToEBITDA,
  calculateDSCR,
  calculateEBIT,
  calculateEBITDA,
  calculateEBITDAMargin,
  calculateEBITMargin,
  calculateGrossMargin,
  calculateGrossProfit,
  calculateMarketingEfficiencyPct,
  calculateNetMargin,
  calculateNetProfit,
  calculatePeriodGrowthPct,
  calculateROAS,
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

describe('calculateROI', () => {
  it('ROI returns null when investment is zero', () => {
    expect(calculateROI(100, 0)).toBeNull()
  })
  it('ROI computes percentage', () => {
    expect(calculateROI(50, 200)).toBe(25)
  })
})

describe('calculateMarketingEfficiencyPct (НЕ настоящий ROMI, оценка по всей выручке)', () => {
  it('returns null when marketing cost is zero', () => {
    expect(calculateMarketingEfficiencyPct(1000, 0)).toBeNull()
  })
  it('computes percentage return over spend using total revenue', () => {
    expect(calculateMarketingEfficiencyPct(1500, 500)).toBe(200)
  })
})

describe('calculateROMI (настоящий, требует attributed revenue + валовую маржу)', () => {
  it('returns null when marketing cost is zero', () => {
    expect(calculateROMI(1000, 50, 0)).toBeNull()
  })
  it('returns null when there is no attributed revenue (no attribution data)', () => {
    expect(calculateROMI(0, 50, 500)).toBeNull()
  })
  it('computes net return on the marketing-attributed gross profit', () => {
    // attributed revenue 10000, margin 50% -> gross profit 5000, spend 2000 -> (5000-2000)/2000*100
    expect(calculateROMI(10000, 50, 2000)).toBe(150)
  })
  it('the example from the bug report: whole-revenue formula massively overstates return', () => {
    const wrong = calculateMarketingEfficiencyPct(10000000, 500000)
    expect(wrong).toBe(1900) // 1900% — misleadingly implies marketing drove all 10M
    // With only 1.5M of the 10M actually attributed to marketing, at 40% margin:
    const real = calculateROMI(1500000, 40, 500000)
    expect(real).toBeCloseTo(20, 5) // (1.5M*0.4 - 500k)/500k*100 = 20% — the honest number
  })
})

describe('calculateROAS', () => {
  it('returns null without marketing cost or attributed revenue', () => {
    expect(calculateROAS(1000, 0)).toBeNull()
    expect(calculateROAS(0, 1000)).toBeNull()
  })
  it('computes attributed revenue per unit of spend (no margin applied)', () => {
    expect(calculateROAS(4000, 1000)).toBe(4)
  })
})

describe('calculateCAC', () => {
  it('returns null when there are no new customers', () => {
    expect(calculateCAC(100000, 0)).toBeNull()
  })
  it('divides spend by new customers', () => {
    expect(calculateCAC(100000, 50)).toBe(2000)
  })
})

describe('calculateCPA', () => {
  it('returns null when there are no conversions', () => {
    expect(calculateCPA(50000, 0)).toBeNull()
  })
  it('divides ad spend by conversions', () => {
    expect(calculateCPA(50000, 200)).toBe(250)
  })
})

describe('calculateDebtServiceRatio', () => {
  it('returns null on zero revenue', () => {
    expect(calculateDebtServiceRatio(1000, 0)).toBeNull()
  })
  it('computes percentage of revenue', () => {
    expect(calculateDebtServiceRatio(100, 1000)).toBe(10)
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

describe('calculateDebtToEBITDA (остаток долга, не платежи)', () => {
  it('computes the ratio of outstanding debt to annual EBITDA', () => {
    // Пример из ревью: долг 12M, EBITDA 6M -> 2.0x
    expect(calculateDebtToEBITDA(12000000, 6000000)).toBeCloseTo(2, 5)
  })
  it('returns null when EBITDA is zero or negative (ratio would be meaningless/undefined)', () => {
    expect(calculateDebtToEBITDA(1200000, 0)).toBeNull()
    expect(calculateDebtToEBITDA(1200000, -500000)).toBeNull()
  })
})

describe('calculateDSCR', () => {
  it('computes how many times EBITDA covers debt service (legacy 2-arg call, taxes/capex default to 0)', () => {
    expect(calculateDSCR(300000, 200000)).toBe(1.5)
  })
  it('returns null when there is no debt service (division by zero guard)', () => {
    expect(calculateDSCR(300000, 0)).toBeNull()
  })
  it('can be below 1, signalling EBITDA does not cover debt payments', () => {
    expect(calculateDSCR(100000, 200000)).toBe(0.5)
  })
  it('subtracts taxes and maintenance capex before comparing to debt service', () => {
    // EBITDA 1M, taxes 150k, capex 200k, WC change 200k, debt service 500k
    // cash available = 1,000,000 - 150,000 - 200,000 - 200,000 = 450,000 -> 450,000/500,000 = 0.9
    expect(calculateDSCR(1000000, 500000, 150000, 200000, 200000)).toBeCloseTo(0.9, 5)
  })
  it('a naive EBITDA-only DSCR would look safe (2.0x) while the conservative one shows real risk (0.9x)', () => {
    const naive = calculateDSCR(1000000, 500000)
    const conservative = calculateDSCR(1000000, 500000, 150000, 200000, 200000)
    expect(naive).toBe(2)
    expect(conservative).toBeCloseTo(0.9, 5)
  })
})
