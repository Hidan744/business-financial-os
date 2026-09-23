import type { Product, StockMovement } from '@/types/inventory'
import {
  buildStockStatus,
  calculateStockOnHandAsOf,
  calculateStockValue,
  summarizeMovementsInRange,
  type PeriodMovementsSummary,
  type StockStatus,
} from './inventory'

export interface InventoryDigestAlert extends StockStatus {
  productName: string
  unit: string
}

export interface InventoryDigest {
  valueNow: number
  valueSince: number
  valueDelta: number
  movements: PeriodMovementsSummary
  alerts: InventoryDigestAlert[]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Сводка по складу для карточки «Сводка за день» — что изменилось с sinceDate (обычно дата
 * прошлого визита) по asOfDate включительно. Разница в стоимости считается по фактическому
 * остатку на обе даты (calculateStockOnHandAsOf), а не суммированием движений — так входит
 * себестоимость товара на текущий момент, а не на момент каждого прихода.
 */
export function buildInventoryDigest(
  products: Product[],
  movements: StockMovement[],
  sinceDate: string,
  asOfDate: string,
): InventoryDigest {
  const valueNow = products.reduce(
    (sum, p) => sum + calculateStockValue(calculateStockOnHandAsOf(p.id, movements, asOfDate), p.costPerUnit),
    0,
  )
  const valueSince = products.reduce(
    (sum, p) => sum + calculateStockValue(calculateStockOnHandAsOf(p.id, movements, sinceDate), p.costPerUnit),
    0,
  )

  // Движения строго после sinceDate (тот день уже учтён в valueSince) и по asOfDate включительно.
  const rangeFrom = addDays(sinceDate, 1)
  const rangeMovements = summarizeMovementsInRange(movements, products, rangeFrom, asOfDate)

  const alerts = products
    .map((p) => ({ ...buildStockStatus(p, movements, asOfDate), productName: p.name, unit: p.unit }))
    .filter((s) => s.level !== 'ok')
    .sort((a, b) => (a.level === b.level ? 0 : a.level === 'critical' ? -1 : 1))

  return { valueNow, valueSince, valueDelta: valueNow - valueSince, movements: rangeMovements, alerts }
}
