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

/** Остаток товара на конкретную дату в прошлом — те же движения, но только по asOfDate включительно. */
export function calculateStockOnHandAsOf(productId: string, movements: StockMovement[], asOfDate: string): number {
  return movements
    .filter((m) => m.productId === productId && m.date <= asOfDate)
    .reduce((sum, m) => sum + signedQuantity(m), 0)
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

export interface PeriodMovementsSummary {
  from: string
  to: string
  receiptsQty: number
  receiptsValue: number
  receiptsCount: number
  salesQty: number
  salesValue: number
  salesCount: number
  writeoffsQty: number
  writeoffsValue: number
  writeoffsCount: number
  movementsCount: number
  /** Чистое изменение остатка (в штуках) за период по всем товарам. */
  netQtyChange: number
  /** Чистое изменение стоимости склада за период (по себестоимости товара на момент движения). */
  netValueChange: number
}

/**
 * Сводка движений за период [from, to] (включительно, по строковым датам 'YYYY-MM-DD') —
 * основа и для карточки «за день» (from === to), и для сравнения двух произвольных периодов.
 * Стоимость движения — costPerUnit самого движения (если указан, напр. у прихода), иначе
 * текущая себестоимость товара.
 */
export function summarizeMovementsInRange(
  movements: StockMovement[],
  products: Product[],
  from: string,
  to: string,
): PeriodMovementsSummary {
  const productById = new Map(products.map((p) => [p.id, p]))
  const inRange = from <= to ? movements.filter((m) => m.date >= from && m.date <= to) : []

  const summary: PeriodMovementsSummary = {
    from,
    to,
    receiptsQty: 0,
    receiptsValue: 0,
    receiptsCount: 0,
    salesQty: 0,
    salesValue: 0,
    salesCount: 0,
    writeoffsQty: 0,
    writeoffsValue: 0,
    writeoffsCount: 0,
    movementsCount: inRange.length,
    netQtyChange: 0,
    netValueChange: 0,
  }

  for (const m of inRange) {
    const unitCost = m.costPerUnit ?? productById.get(m.productId)?.costPerUnit ?? 0
    const value = m.quantity * unitCost
    const signed = signedQuantity(m)
    summary.netQtyChange += signed
    summary.netValueChange += signed * unitCost
    if (m.type === 'receipt') {
      summary.receiptsQty += m.quantity
      summary.receiptsValue += value
      summary.receiptsCount += 1
    } else if (m.type === 'sale') {
      summary.salesQty += m.quantity
      summary.salesValue += value
      summary.salesCount += 1
    } else if (m.type === 'writeoff') {
      summary.writeoffsQty += m.quantity
      summary.writeoffsValue += value
      summary.writeoffsCount += 1
    }
  }

  return summary
}
