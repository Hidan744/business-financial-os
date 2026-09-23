import { describe, expect, it } from 'vitest'
import type { Product, StockMovement } from '@/types/inventory'
import { buildInventoryDigest } from './dailyDigest'

function movement(overrides: Partial<StockMovement> = {}): StockMovement {
  return { id: 'm1', productId: 'p1', date: '2026-09-10', type: 'receipt', quantity: 10, ...overrides }
}

function product(overrides: Partial<Product> = {}): Product {
  return { id: 'p1', name: 'Худи', sku: 'HD-001', unit: 'шт', minStockLevel: 20, costPerUnit: 1500, ...overrides }
}

describe('buildInventoryDigest', () => {
  it('reports value delta between sinceDate and asOfDate from real on-hand snapshots', () => {
    const products = [product({ costPerUnit: 1000 })]
    const movements: StockMovement[] = [
      movement({ id: 'm1', type: 'receipt', date: '2026-09-01', quantity: 100 }),
      movement({ id: 'm2', type: 'sale', date: '2026-09-05', quantity: 30 }), // before "since"
      movement({ id: 'm3', type: 'sale', date: '2026-09-08', quantity: 10 }), // inside the digest window
    ]
    const digest = buildInventoryDigest(products, movements, '2026-09-06', '2026-09-10')

    // as of 2026-09-06: 100 - 30 = 70 -> value 70000
    // as of 2026-09-10: 70 - 10 = 60 -> value 60000
    expect(digest.valueSince).toBe(70000)
    expect(digest.valueNow).toBe(60000)
    expect(digest.valueDelta).toBe(-10000)
  })

  it('only counts movements strictly after sinceDate in the movements summary', () => {
    const products = [product()]
    const movements: StockMovement[] = [
      movement({ id: 'm1', type: 'sale', date: '2026-09-06', quantity: 5 }), // on sinceDate itself: already reflected in valueSince
      movement({ id: 'm2', type: 'sale', date: '2026-09-07', quantity: 3 }),
    ]
    const digest = buildInventoryDigest(products, movements, '2026-09-06', '2026-09-10')
    expect(digest.movements.salesQty).toBe(3)
    expect(digest.movements.salesCount).toBe(1)
  })

  it('flags products that are low or critical as of asOfDate, sorted critical first', () => {
    const products = [
      product({ id: 'p1', name: 'Мало', minStockLevel: 50 }),
      product({ id: 'p2', name: 'Критично', minStockLevel: 5 }),
      product({ id: 'p3', name: 'В порядке', minStockLevel: 5 }),
    ]
    const movements: StockMovement[] = [
      movement({ id: 'm1', productId: 'p1', type: 'receipt', date: '2026-09-01', quantity: 20 }), // below minStockLevel 50 -> low
      movement({ id: 'm2', productId: 'p2', type: 'receipt', date: '2026-09-01', quantity: 5 }),
      movement({ id: 'm3', productId: 'p2', type: 'sale', date: '2026-09-02', quantity: 5 }), // onHand 0 -> critical
      movement({ id: 'm4', productId: 'p3', type: 'receipt', date: '2026-09-01', quantity: 100 }), // well above minimum -> ok
    ]
    const digest = buildInventoryDigest(products, movements, '2026-09-01', '2026-09-10')
    expect(digest.alerts.map((a) => a.productName)).toEqual(['Критично', 'Мало'])
  })

  it('produces zero deltas and no alerts when there are no movements at all', () => {
    const digest = buildInventoryDigest([product()], [], '2026-09-01', '2026-09-10')
    expect(digest.valueNow).toBe(0)
    expect(digest.valueDelta).toBe(0)
    expect(digest.movements.movementsCount).toBe(0)
  })
})
