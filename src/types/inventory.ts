/** Товар (SKU) на складе. */
export interface Product {
  id: string
  name: string
  sku: string
  unit: string // 'шт', 'кг', 'м' и т.п.
  /** Порог «мало на складе» — задаётся вручную, зависит от товара и скорости продаж. */
  minStockLevel: number
  /** Текущая закупочная себестоимость единицы — для оценки стоимости остатка на складе. */
  costPerUnit: number
}

/**
 * Движение товара. quantity всегда положительное — реальное количество единиц,
 * направление (плюс/минус к остатку) определяется type, а не знаком числа.
 */
export type StockMovementType = 'receipt' | 'sale' | 'writeoff' | 'adjustment_in' | 'adjustment_out'

export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  receipt: 'Приход (закупка)',
  sale: 'Продажа',
  writeoff: 'Списание (брак, недостача)',
  adjustment_in: 'Корректировка (+)',
  adjustment_out: 'Корректировка (−)',
}

export interface StockMovement {
  id: string
  productId: string
  date: string // 'YYYY-MM-DD'
  type: StockMovementType
  quantity: number
  /** Закупочная цена этой партии — обычно указывается только для receipt. */
  costPerUnit?: number
  note?: string
}

export function emptyProduct(): Omit<Product, 'id'> {
  return { name: '', sku: '', unit: 'шт', minStockLevel: 0, costPerUnit: 0 }
}
