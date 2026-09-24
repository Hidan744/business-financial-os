export type PricingMethod = 'markup' | 'margin'

/**
 * Доля постоянных расходов на одну единицу = постоянные расходы за период / ожидаемый объём
 * продаж за тот же период. 0, если объём не задан — тогда цена считается только от прямой
 * себестоимости, без распределения накладных.
 */
export function calculateOverheadPerUnit(fixedCosts: number, expectedVolume: number): number {
  return expectedVolume > 0 ? Math.max(0, fixedCosts) / expectedVolume : 0
}

/** Наценка — % от себестоимости: Цена = Себестоимость × (1 + Наценка). */
export function calculatePriceFromMarkup(fullCost: number, markupPct: number): number {
  return Math.max(0, fullCost) * (1 + markupPct / 100)
}

/**
 * Маржа — % от цены продажи: Цена = Себестоимость / (1 − Маржа). Маржа ≥ 100% математически
 * невозможна (означала бы бесконечную или отрицательную цену) — возвращает null.
 */
export function calculatePriceFromMargin(fullCost: number, marginPct: number): number | null {
  const denom = 1 - marginPct / 100
  if (denom <= 0) return null
  return Math.max(0, fullCost) / denom
}

/** Фактическая наценка по уже известной цене — обратная величина к calculatePriceFromMarkup. */
export function calculateMarkupPct(price: number, fullCost: number): number | null {
  if (fullCost <= 0) return null
  return (price / fullCost - 1) * 100
}

/** Фактическая маржа по уже известной цене — обратная величина к calculatePriceFromMargin. */
export function calculateMarginPct(price: number, fullCost: number): number | null {
  if (price <= 0) return null
  return ((price - fullCost) / price) * 100
}

/**
 * Цена с учётом НДС — ставка начисляется СВЕРХ цены без НДС (это деньги, которые бизнес
 * собирает с покупателя и передаёт в бюджет, а не часть его выручки/маржи).
 */
export function calculatePriceWithVat(priceExVat: number, vatRatePct: number): number {
  return Math.max(0, priceExVat) * (1 + vatRatePct / 100)
}

/**
 * Точка безубыточности в штуках при заданной цене: постоянные расходы ÷ маржинальная прибыль
 * с одной единицы (цена без НДС минус прямая себестоимость — без учёта уже распределённой в
 * цену доли постоянных, иначе постоянные расходы посчитались бы дважды). null, если цена не
 * покрывает даже прямую себестоимость — бизнес не выйдет в безубыток ни при каком объёме.
 */
export function calculateBreakEvenUnitsAtPrice(fixedCosts: number, priceExVat: number, costPerUnit: number): number | null {
  const contributionPerUnit = priceExVat - costPerUnit
  if (contributionPerUnit <= 0) return null
  return Math.max(0, fixedCosts) / contributionPerUnit
}
