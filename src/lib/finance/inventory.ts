import type { Product, StockMovement, StockMovementType } from '@/types/inventory'

/** Мало на складе, даже если остаток ещё не ушёл в ноль. */
export const DEFAULT_LOW_RUNWAY_DAYS = 7

/**
 * Знак движения относительно остатка — единственное место, которое решает,
 * увеличивает тип движения остаток или уменьшает. quantity в StockMovement
 * всегда положительное (реальное количество), направление задаёт type.
 */
export function signedQuantity(movement: Pick<StockMovement, 'type' | 'quantity'>): number {
  const direction: Record<StockMovementType, 1 | -1> = {
    receipt: 1,
    adjustment_in: 1,
    sale: -1,
    writeoff: -1,
    adjustment_out: -1,
  }
  return direction[movement.type] * movement.quantity
}

/** Текущий остаток товара = сумма всех движений по нему (не вводится вручную). */
export function calculateStockOnHand(productId: string, movements: StockMovement[]): number {
  return movements.filter((m) => m.productId === productId).reduce((sum, m) => sum + signedQuantity(m), 0)
}

/** Оценка стоимости остатка на складе по текущей закупочной себестоимости товара. */
export function calculateStockValue(onHand: number, costPerUnit: number): number {
  return onHand * costPerUnit
}

/**
 * Средний расход в день за последние windowDays (считая asOfDate последним днём) —
 * продажи и списания, но не разовые корректировки (adjustment_out), чтобы одна
 * ручная правка не искажала темп расхода. null — если за период расхода не было
 * (не от чего считать «хватит на сколько дней»).
 */
export function calculateAvgDailyOutflow(
  productId: string,
  movements: StockMovement[],
  asOfDate: string,
  windowDays = 30,
): number | null {
  const end = new Date(asOfDate)
  const start = new Date(end)
  start.setDate(start.getDate() - windowDays + 1)

  const totalOutflow = movements
    .filter((m) => m.productId === productId && (m.type === 'sale' || m.type === 'writeoff'))
    .filter((m) => {
      const d = new Date(m.date)
      return d >= start && d <= end
    })
    .reduce((sum, m) => sum + m.quantity, 0)

  if (totalOutflow <= 0) return null
  return totalOutflow / windowDays
}

/**
 * На сколько дней хватит текущего остатка при среднем темпе расхода.
 * null — если расхода нет (запас не убывает этим темпом, прогноз не имеет смысла).
 * 0 — если остаток уже исчерпан.
 */
export function calculateStockRunwayDays(onHand: number, avgDailyOutflow: number | null): number | null {
  if (avgDailyOutflow === null || avgDailyOutflow <= 0) return null
  if (onHand <= 0) return 0
  return onHand / avgDailyOutflow
}

export type StockStatusLevel = 'ok' | 'low' | 'critical'

export interface StockStatus {
  productId: string
  onHand: number
  value: number
  avgDailyOutflow: number | null
  runwayDays: number | null
  belowMinimum: boolean
  level: StockStatusLevel
}

/**
 * Итоговый статус по товару: остаток, стоимость, темп расхода, сколько дней хватит,
 * и уровень тревоги — critical (остаток уже 0 или меньше), low (ниже заданного
 * порога ИЛИ хватит меньше lowRunwayDays дней при текущем темпе), иначе ok.
 */
export function buildStockStatus(
  product: Product,
  movements: StockMovement[],
  asOfDate: string,
  windowDays = 30,
  lowRunwayDays = DEFAULT_LOW_RUNWAY_DAYS,
): StockStatus {
  const onHand = calculateStockOnHand(product.id, movements)
  const value = calculateStockValue(onHand, product.costPerUnit)
  const avgDailyOutflow = calculateAvgDailyOutflow(product.id, movements, asOfDate, windowDays)
  const runwayDays = calculateStockRunwayDays(onHand, avgDailyOutflow)
  const belowMinimum = onHand < product.minStockLevel

  let level: StockStatusLevel = 'ok'
  if (onHand <= 0) level = 'critical'
  else if (belowMinimum || (runwayDays !== null && runwayDays <= lowRunwayDays)) level = 'low'

  return { productId: product.id, onHand, value, avgDailyOutflow, runwayDays, belowMinimum, level }
}
