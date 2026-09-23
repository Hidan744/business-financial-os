import type { FinancialInputs, FinancialSnapshot } from '@/types/finance'
import {
  calculateContributionMarginPct,
  calculateDebtServiceRatio,
  calculateDebtToEBITDA,
  calculateDSCR,
  calculateEBIT,
  calculateEBITDA,
  calculateEBITDAMargin,
  calculateEBITMargin,
  calculateGrossMargin,
  calculateGrossProfit,
  calculateMarketingEfficiencyPct,
  calculateNetMargin,
  calculateNetProfit,
  calculateROAS,
  calculateROMI,
} from './formulas'
import { calculateBreakEvenRevenue, calculateBreakEvenSales, calculateSafetyMarginPct } from './breakeven'

export interface SnapshotContext {
  /**
   * Остаток долга на конец периода (кратко- + долгосрочный, из раздела «Баланс»).
   * Если не передан — Долг/EBITDA возвращается как null, а не додумывается по платежам
   * (платежи по кредиту с длинным сроком могут быть маленькими при большом остатке долга).
   */
  outstandingDebt?: number
  /** CAPEX за период (покупка/ремонт оборудования и т.п., из Cash Flow → Инвестиционная деятельность). */
  maintenanceCapex?: number
  /**
   * Изменение оборотного капитала за период (рост дебиторки + рост запасов − рост кредиторки).
   * По умолчанию 0 — для точного расчёта нужна история баланса минимум за два периода.
   */
  changeInWorkingCapital?: number
}

/** Постоянные расходы = всё, кроме себестоимости (COGS — единственные переменные затраты в модели). */
export function getFixedCosts(inputs: FinancialInputs): number {
  const customTotal = inputs.customExpenseLines.reduce((sum, line) => sum + line.amount, 0)
  return (
    inputs.payroll +
    inputs.rent +
    inputs.marketing +
    inputs.logistics +
    inputs.utilities +
    inputs.software +
    customTotal
  )
}

/** Переменные затраты = себестоимость + переменные операционные расходы (комиссии, эквайринг, доставка за ед.). */
export function getVariableCosts(inputs: FinancialInputs): number {
  return inputs.cogs + (inputs.variableOpex ?? 0)
}

export function buildFinancialSnapshot(inputs: FinancialInputs, context: SnapshotContext = {}): FinancialSnapshot {
  const grossProfit = calculateGrossProfit(inputs.revenue, inputs.cogs)
  const grossMarginPct = calculateGrossMargin(grossProfit, inputs.revenue) ?? 0

  const contributionProfit = grossProfit - (inputs.variableOpex ?? 0)
  const fixedCosts = getFixedCosts(inputs)
  const variableCosts = getVariableCosts(inputs)

  // EBITDA = Валовая прибыль − Переменные опер. расходы − Постоянные расходы (Contribution Profit − Fixed Costs).
  const ebitda = calculateEBITDA(contributionProfit, fixedCosts)
  const ebitdaMarginPct = calculateEBITDAMargin(ebitda, inputs.revenue) ?? 0

  const ebit = calculateEBIT(ebitda, inputs.depreciation)
  const ebitMarginPct = calculateEBITMargin(ebit, inputs.revenue) ?? 0

  const netProfit = calculateNetProfit(ebitda, inputs.depreciation, inputs.loanInterest, inputs.taxes)
  const netMarginPct = calculateNetMargin(netProfit, inputs.revenue) ?? 0

  const contributionMarginPct = calculateContributionMarginPct(inputs.revenue, variableCosts) ?? 0
  const breakEvenRevenue = calculateBreakEvenRevenue(fixedCosts, contributionMarginPct)
  const breakEvenSales = calculateBreakEvenSales(breakEvenRevenue, inputs.avgCheck) ?? 0
  const safetyMarginPct = calculateSafetyMarginPct(inputs.revenue, breakEvenRevenue) ?? 0

  const totalCashOut =
    inputs.cogs + (inputs.variableOpex ?? 0) + fixedCosts + inputs.taxes + inputs.loanInterest + inputs.loanPayments
  const cashFlow = inputs.revenue - totalCashOut

  const marketingEfficiencyPct = calculateMarketingEfficiencyPct(inputs.revenue, inputs.marketing) ?? 0
  const attributedRevenue = inputs.attributedRevenue ?? 0
  const romiPct = calculateROMI(attributedRevenue, grossMarginPct, inputs.marketing)
  const roas = calculateROAS(attributedRevenue, inputs.marketing)

  const debtService = inputs.loanPayments + inputs.loanInterest
  const debtServiceRatioPct = calculateDebtServiceRatio(debtService, inputs.revenue) ?? 0
  const debtToEbitda =
    context.outstandingDebt !== undefined ? calculateDebtToEBITDA(context.outstandingDebt, ebitda * 12) : null
  const dscr = calculateDSCR(
    ebitda,
    debtService,
    inputs.taxes,
    context.maintenanceCapex ?? 0,
    context.changeInWorkingCapital ?? 0,
  )

  return {
    revenue: inputs.revenue,
    cogs: inputs.cogs,
    grossProfit,
    grossMarginPct,
    contributionProfit,
    fixedCosts,
    variableCosts,
    ebitda,
    ebitdaMarginPct,
    ebit,
    ebitMarginPct,
    netProfit,
    netMarginPct,
    contributionMarginPct: contributionMarginPct * 100,
    breakEvenRevenue: breakEvenRevenue ?? 0,
    breakEvenSales,
    safetyMarginPct,
    cashFlow,
    marketingEfficiencyPct,
    romiPct,
    roas,
    debtServiceRatioPct,
    debtToEbitda,
    dscr,
  }
}
