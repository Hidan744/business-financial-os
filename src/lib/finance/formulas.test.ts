import { describe, expect, it } from 'vitest'
import {
  calculateDebtLoad,
  calculateEBITDA,
  calculateEBITDAMargin,
  calculateGrossMargin,
  calculateGrossProfit,
  calculateNetMargin,
  calculateNetProfit,
  calculateROI,
  calculateROMI,
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
