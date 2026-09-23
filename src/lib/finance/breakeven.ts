import { estimateTaxForProjection, type TaxProjectionContext } from './tax'

/**
 * Точка безубыточности и расчёт целевого дохода.
 * contributionMarginPct — доля от выручки, покрывающая постоянные расходы (0..1).
 */

export function calculateBreakEvenRevenue(
  fixedCosts: number,
  contributionMarginPct: number | null,
): number | null {
  if (contributionMarginPct === null || contributionMarginPct <= 0) return null
  return fixedCosts / contributionMarginPct
}

export function calculateBreakEvenSales(
  breakEvenRevenue: number | null,
  avgCheck: number,
): number | null {
  if (breakEvenRevenue === null || avgCheck <= 0) return null
  return breakEvenRevenue / avgCheck
}

/** Запас финансовой прочности: насколько текущая выручка выше точки безубыточности. */
export function calculateSafetyMarginPct(
  revenue: number,
  breakEvenRevenue: number | null,
): number | null {
  if (revenue <= 0) return null
  if (breakEvenRevenue === null) return null
  return ((revenue - breakEvenRevenue) / revenue) * 100
}

/**
 * Выручка, нужная для целевой прибыли НА УРОВНЕ EBITDA (contributionProfit − fixedCosts = targetProfit) —
 * то есть ДО амортизации, процентов по кредиту и налогов. НЕ использовать, если targetProfit — это
 * целевая ЧИСТАЯ прибыль ("хочу столько-то чистыми"): для этого есть calculateRequiredRevenueForNetProfit,
 * которая честно учитывает амортизацию, проценты и налог (через реальный движок или оценку по ставке).
 */
export function calculateRequiredRevenue(
  targetProfit: number,
  fixedCosts: number,
  contributionMarginPct: number | null,
): number | null {
  if (contributionMarginPct === null || contributionMarginPct <= 0) return null
  return (targetProfit + fixedCosts) / contributionMarginPct
}

export function calculateRequiredSales(
  requiredRevenue: number | null,
  avgCheck: number,
): number | null {
  if (requiredRevenue === null || avgCheck <= 0) return null
  return requiredRevenue / avgCheck
}

export interface RequiredRevenueForNetProfitResult {
  requiredRevenue: number | null
  requiredSales: number | null
  status: 'ok' | 'target_unreachable'
}

/**
 * Выручка, нужная для целевой ЧИСТОЙ прибыли (после амортизации, процентов и налога) — решается
 * итеративно (бисекция), а не по формуле "в лоб": налог не всегда линеен от выручки (минимальный
 * налог на УСН «Доходы минус расходы», ступенчатые режимы и т.п.), поэтому явную формулу нельзя
 * применять механически ко всем налоговым режимам. На каждом шаге прогоняется полная цепочка
 * Revenue → Contribution Profit → EBITDA → EBIT → EBT → (реальный tax engine) → Net Profit,
 * и revenue двигается, пока Net Profit не сойдётся к targetNetProfit с точностью до 1 ₽.
 *
 * variableCostRatio — переменные затраты как доля от выручки (напр. cogs/revenue), считается
 * постоянной при масштабировании — то же допущение, что уже использует Forecast для COGS.
 *
 * status "target_unreachable" — цель недостижима ни при какой выручке: либо маржинальность
 * не покрывает постоянные расходы (contributionMarginPct ≤ 0), либо даже огромная выручка не
 * даёт нужную чистую прибыль при текущей структуре затрат — тогда requiredRevenue = null,
 * а НЕ приблизительное число, которое выглядит как ответ, но им не является.
 */
export function calculateRequiredRevenueForNetProfit(
  targetNetProfit: number,
  fixedCosts: number,
  variableCostRatio: number,
  depreciation: number,
  interest: number,
  avgCheck: number,
  tax: TaxProjectionContext,
): RequiredRevenueForNetProfitResult {
  const contributionMarginPct = 1 - variableCostRatio
  if (contributionMarginPct <= 0) {
    return { requiredRevenue: null, requiredSales: null, status: 'target_unreachable' }
  }

  function netProfitAtRevenue(revenue: number): number {
    const variableCosts = revenue * variableCostRatio
    const grossProfit = revenue - variableCosts
    const ebitda = grossProfit - fixedCosts
    const ebit = ebitda - depreciation
    const ebt = ebit - interest
    const taxAmount = estimateTaxForProjection(revenue, variableCosts + fixedCosts, ebit, tax)
    return ebt - taxAmount
  }

  let lo = 0
  let hi = Math.max(1, (Math.abs(targetNetProfit) + fixedCosts + depreciation + interest + 1) / contributionMarginPct)

  let expandGuard = 0
  while (netProfitAtRevenue(hi) < targetNetProfit && expandGuard < 60) {
    hi *= 2
    expandGuard++
  }
  if (netProfitAtRevenue(hi) < targetNetProfit) {
    return { requiredRevenue: null, requiredSales: null, status: 'target_unreachable' }
  }

  // 100 бисекций на разумном диапазоне сходятся к точности << 1 ₽ — с большим запасом.
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    if (netProfitAtRevenue(mid) < targetNetProfit) lo = mid
    else hi = mid
  }

  const requiredRevenue = hi
  const requiredSales = avgCheck > 0 ? requiredRevenue / avgCheck : null
  return { requiredRevenue, requiredSales, status: 'ok' }
}

export interface AllowedCacResult {
  cac: number | null
  status: 'ok' | 'insufficient_data' | 'target_unreachable'
}

/**
 * Допустимая стоимость привлечения клиента (CAC), при которой цель по прибыли всё ещё
 * достижима: маржинальная прибыль с продажи минус целевая прибыль на продажу.
 *
 * Раньше отрицательный результат "прятался" под Math.max(0, cac) — CAC=0 выглядел как
 * законный ответ, а на деле означал, что цель недостижима при заданном числе продаж и
 * текущей экономике. Теперь это возвращается явно как status: "target_unreachable" —
 * интерфейс обязан показать это пользователю, а не притвориться, что реклама должна
 * быть бесплатной.
 */
export function calculateAllowedCAC(
  avgCheck: number,
  contributionMarginPct: number | null,
  targetProfit: number,
  requiredSales: number | null,
): AllowedCacResult {
  if (contributionMarginPct === null || requiredSales === null || requiredSales <= 0) {
    return { cac: null, status: 'insufficient_data' }
  }
  const contributionPerSale = avgCheck * contributionMarginPct
  const profitPerSale = targetProfit / requiredSales
  const cac = contributionPerSale - profitPerSale
  if (cac < 0) return { cac: null, status: 'target_unreachable' }
  return { cac, status: 'ok' }
}

/** Сколько можно вывести из бизнеса сейчас, не опускаясь ниже минимального резерва. */
export function calculateWithdrawableAmount(cashBalance: number, minimumReserve: number): number {
  return Math.max(0, cashBalance - minimumReserve)
}
