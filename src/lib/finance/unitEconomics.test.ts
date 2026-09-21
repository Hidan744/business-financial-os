import { describe, expect, it } from 'vitest'
import {
  calculateCustomerLifetimeMonths,
  calculateLTV,
  calculateLtvCacRatio,
  calculatePaybackMonths,
} from './unitEconomics'

describe('calculateCustomerLifetimeMonths', () => {
  it('computes lifetime as 100 / churn rate %', () => {
    expect(calculateCustomerLifetimeMonths(10)).toBe(10)
    expect(calculateCustomerLifetimeMonths(5)).toBe(20)
  })
  it('returns null when churn is zero or negative (undefined lifetime)', () => {
    expect(calculateCustomerLifetimeMonths(0)).toBeNull()
    expect(calculateCustomerLifetimeMonths(-5)).toBeNull()
  })
})

describe('calculateLTV', () => {
  it('multiplies avgCheck × margin × frequency × lifetime', () => {
    // 850 * 0.7 * 4 (visits/mo) * 12 (mo lifetime)
    expect(calculateLTV(850, 70, 4, 12)).toBeCloseTo(850 * 0.7 * 4 * 12, 5)
  })
  it('is zero when any factor is zero', () => {
    expect(calculateLTV(850, 70, 0, 12)).toBe(0)
    expect(calculateLTV(850, 0, 4, 12)).toBe(0)
  })
})

describe('calculateLtvCacRatio', () => {
  it('computes LTV / CAC', () => {
    expect(calculateLtvCacRatio(30000, 5000)).toBe(6)
  })
  it('returns null when CAC is zero or negative (division by zero guard)', () => {
    expect(calculateLtvCacRatio(30000, 0)).toBeNull()
    expect(calculateLtvCacRatio(30000, -100)).toBeNull()
  })
})

describe('calculatePaybackMonths', () => {
  it('computes months to recover CAC from monthly gross profit per customer', () => {
    // monthly gross profit per customer = 850 * 0.7 * 4 = 2380
    // payback = 5000 / 2380
    expect(calculatePaybackMonths(5000, 850, 70, 4)).toBeCloseTo(5000 / 2380, 5)
  })
  it('returns null when monthly gross profit per customer is zero or negative', () => {
    expect(calculatePaybackMonths(5000, 850, 0, 4)).toBeNull()
    expect(calculatePaybackMonths(5000, 850, 70, 0)).toBeNull()
  })
})
