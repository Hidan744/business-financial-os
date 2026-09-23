import { describe, expect, it } from 'vitest'
import type { Product, StockMovement } from '@/types/inventory'
import {
  buildStockStatus,
  calculateAvgDailyOutflow,
  calculateStockOnHand,
  calculateStockRunwayDays,
  calculateStockValue,
  signedQuantity,
} from './inventory'

function movement(overrides: Partial<StockMovement> = {}): StockMovement {
  return {
    id: 'm1',
    productId: 'p1',
    date: '2026-09-10',
    type: 'receipt',
    quantity: 10,
    ...overrides,
  }
}

function product(overrides: Partial<Product> = {}): Product {
  return { id: 'p1', name: 'Худи', sku: 'HD-001', unit: 'шт', minStockLevel: 20, costPerUnit: 1500, ...overrides }
}

describe('signedQuantity', () => {
  it('receipt and adjustment_in increase stock', () => {
    expect(signedQuantity({ type: 'receipt', quantity: 5 })).toBe(5)
    expect(signedQuantity({ type: 'adjustment_in', quantity: 5 })).toBe(5)
  })

  it('sale, writeoff and adjustment_out decrease stock', () => {
    expect(signedQuantity({ type: 'sale', quantity: 5 })).toBe(-5)
    expect(signedQuantity({ type: 'writeoff', quantity: 5 })).toBe(-5)
    expect(signedQuantity({ type: 'adjustment_out', quantity: 5 })).toBe(-5)
  })
})

describe('calculateStockOnHand', () => {
  it('sums receipts and subtracts sales/writeoffs for the given product only', () => {
    const movements: StockMovement[] = [
      movement({ id: 'm1', type: 'receipt', quantity: 100 }),
      movement({ id: 'm2', type: 'sale', quantity: 30 }),
      movement({ id: 'm3', type: 'writeoff', quantity: 5 }),
      movement({ id: 'm4', productId: 'other', type: 'receipt', quantity: 1000 }), // should be ignored
    ]
    expect(calculateStockOnHand('p1', movements)).toBe(65)
  })

  it('returns 0 for a product with no movements', () => {
    expect(calculateStockOnHand('unknown', [])).toBe(0)
  })

  it('can go negative if sales exceed recorded receipts (data entry issue, not hidden)', () => {
    const movements: StockMovement[] = [movement({ type: 'receipt', quantity: 10 }), movement({ type: 'sale', quantity: 15 })]
    expect(calculateStockOnHand('p1', movements)).toBe(-5)
  })
})

describe('calculateStockValue', () => {
  it('multiplies on-hand quantity by cost per unit', () => {
    expect(calculateStockValue(40, 1500)).toBe(60000)
  })

  it('is 0 for zero stock regardless of cost', () => {
    expect(calculateStockValue(0, 1500)).toBe(0)
  })
})

describe('calculateAvgDailyOutflow', () => {
  it('averages sale+writeoff quantity within the window over windowDays', () => {
    const movements: StockMovement[] = [
      movement({ id: 'm1', type: 'sale', date: '2026-09-05', quantity: 30 }),
      movement({ id: 'm2', type: 'writeoff', date: '2026-09-08', quantity: 10 }),
    ]
    // 40 units over a 10-day window -> 4/day
    expect(calculateAvgDailyOutflow('p1', movements, '2026-09-10', 10)).toBeCloseTo(4, 5)
  })

  it('ignores receipts and adjustments when computing outflow', () => {
    const movements: StockMovement[] = [
      movement({ id: 'm1', type: 'receipt', date: '2026-09-09', quantity: 500 }),
      movement({ id: 'm2', type: 'adjustment_out', date: '2026-09-09', quantity: 200 }),
      movement({ id: 'm3', type: 'sale', date: '2026-09-09', quantity: 10 }),
    ]
    expect(calculateAvgDailyOutflow('p1', movements, '2026-09-10', 10)).toBeCloseTo(1, 5)
  })

  it('excludes movements outside the window', () => {
    const movements: StockMovement[] = [movement({ type: 'sale', date: '2026-08-01', quantity: 100 })]
    expect(calculateAvgDailyOutflow('p1', movements, '2026-09-10', 10)).toBeNull()
  })

  it('returns null when there is no outflow in the window', () => {
    expect(calculateAvgDailyOutflow('p1', [], '2026-09-10', 30)).toBeNull()
  })
})

describe('calculateStockRunwayDays', () => {
  it('divides on-hand by average daily outflow', () => {
    expect(calculateStockRunwayDays(40, 4)).toBeCloseTo(10, 5)
  })

  it('returns null when there is no outflow (stock is not depleting)', () => {
    expect(calculateStockRunwayDays(40, null)).toBeNull()
    expect(calculateStockRunwayDays(40, 0)).toBeNull()
  })

  it('returns 0 when stock is already at or below zero', () => {
    expect(calculateStockRunwayDays(0, 5)).toBe(0)
    expect(calculateStockRunwayDays(-3, 5)).toBe(0)
  })
})

describe('buildStockStatus', () => {
  it('is "ok" when stock is above minimum and runway is comfortable', () => {
    const movements: StockMovement[] = [
      movement({ id: 'm1', type: 'receipt', date: '2026-08-01', quantity: 200 }),
      movement({ id: 'm2', type: 'sale', date: '2026-09-09', quantity: 3 }),
    ]
    const status = buildStockStatus(product({ minStockLevel: 20 }), movements, '2026-09-10', 30, 7)
    expect(status.onHand).toBe(197)
    expect(status.belowMinimum).toBe(false)
    expect(status.level).toBe('ok')
  })

  it('is "low" when on-hand is below the configured minimum', () => {
    const movements: StockMovement[] = [movement({ type: 'receipt', quantity: 15 })]
    const status = buildStockStatus(product({ minStockLevel: 20 }), movements, '2026-09-10')
    expect(status.onHand).toBe(15)
    expect(status.belowMinimum).toBe(true)
    expect(status.level).toBe('low')
  })

  it('is "low" when runway is short even if above the minimum threshold', () => {
    const movements: StockMovement[] = [
      movement({ id: 'm1', type: 'receipt', date: '2026-08-01', quantity: 100 }),
      movement({ id: 'm2', type: 'sale', date: '2026-09-09', quantity: 50 }), // 25/day over a 2-day window -> onHand 50 -> 2 days left
    ]
    const status = buildStockStatus(product({ minStockLevel: 10 }), movements, '2026-09-10', 2, 7)
    expect(status.belowMinimum).toBe(false)
    expect(status.runwayDays).toBeCloseTo(2, 5)
    expect(status.level).toBe('low')
  })

  it('is "critical" when stock has already run out', () => {
    const movements: StockMovement[] = [movement({ type: 'receipt', quantity: 10 }), movement({ type: 'sale', quantity: 10 })]
    const status = buildStockStatus(product({ minStockLevel: 5 }), movements, '2026-09-10')
    expect(status.onHand).toBe(0)
    expect(status.level).toBe('critical')
  })

  it('never produces NaN when there are no movements at all', () => {
    const status = buildStockStatus(product(), [], '2026-09-10')
    expect(Number.isFinite(status.onHand)).toBe(true)
    expect(Number.isFinite(status.value)).toBe(true)
    expect(status.avgDailyOutflow).toBeNull()
    expect(status.runwayDays).toBeNull()
  })
})
