import type { FinancialInputs, FinancialSnapshot } from '@/types/finance'
import {
  calculateContributionMarginPct,
  calculateDebtLoad,
  calculateDebtToEBITDA,
  calculateDSCR,
  calculateEBIT,
  calculateEBITDA,
  calculateEBITDAMargin,
  calculateEBITMargin,
  calculateGrossMargin,
  calculateGrossProfit,
  calculateNetMargin,
  calculateNetProfit,
  calculateROMI,
} from './formulas'
import { calculateBreakEvenRevenue, calculateBreakEvenSales, calculateSafetyMarginPct } from './breakeven'

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

export function getVariableCosts(inputs: FinancialInputs): number {
  return inputs.cogs
}

export function buildFinancialSnapshot(inputs: FinancialInputs): FinancialSnapshot {
  const grossProfit = calculateGrossProfit(inputs.revenue, inputs.cogs)
  const grossMarginPct = calculateGrossMargin(grossProfit, inputs.revenue) ?? 0

  const fixedCosts = getFixedCosts(inputs)
  const variableCosts = getVariableCosts(inputs)

  const ebitda = calculateEBITDA(grossProfit, fixedCosts)
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
    inputs.cogs + fixedCosts + inputs.taxes + inputs.loanInterest + inputs.loanPayments
  const cashFlow = inputs.revenue - totalCashOut

  const romiPct = calculateROMI(inputs.revenue, inputs.marketing) ?? 0
  const debtLoadPct = calculateDebtLoad(inputs.loanPayments, inputs.revenue) ?? 0
  const debtToEbitda = calculateDebtToEBITDA(inputs.loanPayments * 12, ebitda * 12)
  const dscr = calculateDSCR(ebitda, inputs.loanPayments + inputs.loanInterest)

  return {
    revenue: inputs.revenue,
    cogs: inputs.cogs,
    grossProfit,
    grossMarginPct,
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
    romiPct,
    debtLoadPct,
    debtToEbitda,
    dscr,
  }
}
