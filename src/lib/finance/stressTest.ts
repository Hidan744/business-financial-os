import type { FinancialInputs } from '@/types/finance'

/** Падение выручки на pct% — переменные затраты (COGS) снижаются пропорционально, постоянные расходы не меняются. */
export function applyRevenueShock(inputs: FinancialInputs, pct: number): FinancialInputs {
  const factor = 1 - pct / 100
  return {
    ...inputs,
    revenue: inputs.revenue * factor,
    salesCount: inputs.salesCount * factor,
    cogs: inputs.cogs * factor,
  }
}

/** Рост постоянных расходов на pct% (ФОТ, аренда, реклама, логистика, коммуналка, ПО, прочие статьи). */
export function applyFixedCostShock(inputs: FinancialInputs, pct: number): FinancialInputs {
  const factor = 1 + pct / 100
  return {
    ...inputs,
    payroll: inputs.payroll * factor,
    rent: inputs.rent * factor,
    marketing: inputs.marketing * factor,
    logistics: inputs.logistics * factor,
    utilities: inputs.utilities * factor,
    software: inputs.software * factor,
    customExpenseLines: inputs.customExpenseLines.map((line) => ({ ...line, amount: line.amount * factor })),
  }
}

/** Рост себестоимости (COGS) на pct% без изменения выручки — например, подорожание сырья/поставщика. */
export function applyCogsShock(inputs: FinancialInputs, pct: number): FinancialInputs {
  return { ...inputs, cogs: inputs.cogs * (1 + pct / 100) }
}

/** Потеря крупнейшего клиента: та же механика, что падение выручки, но с отдельным, настраиваемым % потери. */
export function applyClientLossShock(inputs: FinancialInputs, lossPct: number): FinancialInputs {
  return applyRevenueShock(inputs, lossPct)
}

/**
 * Запас хода (в месяцах) при текущем остатке денег и заданном ежемесячном cash flow.
 * null — если cash flow не отрицательный (запас хода не ограничен этим сценарием).
 */
export function calculateRunwayMonths(cashBalance: number, monthlyCashFlow: number): number | null {
  if (monthlyCashFlow >= 0) return null
  if (cashBalance <= 0) return 0
  return cashBalance / -monthlyCashFlow
}

/**
 * Сколько денег нужно привлечь, чтобы прожить horizonMonths месяцев при текущем остатке
 * и заданном ежемесячном cash flow. 0 — если денег хватает или cash flow не отрицательный.
 */
export function calculateFundingNeeded(cashBalance: number, monthlyCashFlow: number, horizonMonths: number): number {
  if (monthlyCashFlow >= 0) return 0
  const totalShortfall = -monthlyCashFlow * horizonMonths
  return Math.max(0, totalShortfall - cashBalance)
}
