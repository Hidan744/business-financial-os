import type { BalanceSheetInputs, CashFlowInputs, FinancialInputs, FinancialSnapshot } from '@/types/finance'
import type { DiagnosticResult } from '@/types/diagnostics'
import type { BusinessProfile } from '@/types/business'
import type { ForecastConfig } from '@/types/scenario'
import type { UnitEconomicsAssumptions } from '@/types/unitEconomics'
import { calculateForecast } from '@/lib/finance/forecast'
import { calculateApproxCostPerSale, calculateCAC } from '@/lib/finance/formulas'
import { calculateCustomerLifetimeMonths, calculateLTV, calculateLtvCacRatio, calculatePaybackMonths } from '@/lib/finance/unitEconomics'
import { buildCashFlowSummary } from '@/lib/finance/cashflow'
import { calculateRunwayMonths } from '@/lib/finance/stressTest'
import { calculateWorkingCapitalMetrics } from '@/lib/finance/balanceSheet'
import { buildFinancialSnapshot } from '@/lib/finance/snapshot'

/**
 * Пакет фактов о бизнесе для AI CFO — единственное, что видит LLM. Все цифры уже посчитаны
 * существующими протестированными функциями (снэпшот, диагностика, прогноз, unit-экономика);
 * LLM ничего не пересчитывает и не имеет доступа ни к чему, кроме этого объекта — так
 * невозможно, чтобы модель "придумала" число, которого нет в реальных данных бизнеса.
 */
export interface FinancialContext {
  business: { name: string; type: string; period: string; employeesCount: number; isSelfEmployed: boolean }
  pnl: {
    revenue: number
    cogs: number
    grossProfit: number
    grossMarginPct: number
    fixedCosts: number
    ebitda: number
    ebitdaMarginPct: number
    netProfit: number
    netMarginPct: number
    breakEvenRevenue: number
    safetyMarginPct: number
  }
  cashFlow: { cashFlowThisPeriod: number; cashBalance: number | null; runwayMonths: number | null }
  debt: { debtServiceRatioPct: number; debtToEbitda: number | null; dscr: number | null }
  marketing: { marketingEfficiencyPct: number; romiPct: number | null }
  /** Последние закрытые периоды (не больше 6, от старых к новым) — для вопросов про динамику. */
  history: { period: string; revenue: number; netProfit: number }[]
  forecast12mo: { revenue: number; netProfit: number; endingCashBalance: number; salesGrowthRatePctPerMonth: number }
  unitEconomics: { cac: number | null; ltv: number | null; ltvCacRatio: number | null; paybackMonths: number | null } | null
  workingCapital: { dso: number | null; dpo: number | null; dio: number | null; cashConversionCycleDays: number | null } | null
  diagnostics: {
    healthStatus: string
    healthScore: number
    problems: { title: string; value: string; explanation: string }[]
    actionPlan: { action: string; expectedEffect: string }[]
  }
}

export interface FinancialContextParams {
  profile: BusinessProfile
  inputs: FinancialInputs
  snapshot: FinancialSnapshot
  diagnostics: DiagnosticResult
  history: FinancialInputs[]
  balanceSheet: BalanceSheetInputs | null
  cashFlowInputs: CashFlowInputs | null
  forecastConfig: ForecastConfig
  unitEconomics: UnitEconomicsAssumptions
}

export function buildFinancialContext(params: FinancialContextParams): FinancialContext {
  const { profile, inputs, snapshot, diagnostics, history, balanceSheet, cashFlowInputs, forecastConfig, unitEconomics } = params

  const cashSummary = cashFlowInputs ? buildCashFlowSummary(cashFlowInputs) : null
  const cashBalance = cashSummary?.closingBalance ?? null
  const runwayMonths = cashBalance !== null ? calculateRunwayMonths(cashBalance, snapshot.cashFlow) : null

  const sortedHistory = [...history].sort((a, b) => a.period.localeCompare(b.period)).slice(-6)

  const forecastPoints = calculateForecast(inputs, forecastConfig, { currentEmployeesCount: Math.max(1, profile.employeesCount) })
  const forecastRevenue = forecastPoints.reduce((s, p) => s + p.revenue, 0)
  const forecastNetProfit = forecastPoints.reduce((s, p) => s + p.netProfit, 0)
  const endingCashBalance = forecastPoints.length > 0 ? forecastPoints[forecastPoints.length - 1].cashBalance : 0

  const approxCac = calculateApproxCostPerSale(inputs.marketing, inputs.salesCount)
  const newCustomers = unitEconomics.newCustomersCount ?? 0
  const cac = unitEconomics.manualCac ?? (newCustomers > 0 ? calculateCAC(inputs.marketing, newCustomers) : approxCac)
  const lifetimeMonths = calculateCustomerLifetimeMonths(unitEconomics.monthlyChurnRatePct)
  const ltv =
    lifetimeMonths !== null ? calculateLTV(inputs.avgCheck, snapshot.grossMarginPct, unitEconomics.purchaseFrequencyPerMonth, lifetimeMonths) : null
  const ltvCacRatio = ltv !== null && cac !== null ? calculateLtvCacRatio(ltv, cac) : null
  const paybackMonths = cac !== null ? calculatePaybackMonths(cac, inputs.avgCheck, snapshot.grossMarginPct, unitEconomics.purchaseFrequencyPerMonth) : null

  const workingCapital = balanceSheet
    ? calculateWorkingCapitalMetrics(
        balanceSheet.currentAssets.receivables,
        balanceSheet.currentLiabilities.payables,
        balanceSheet.currentAssets.inventory,
        inputs.revenue,
        inputs.cogs,
      )
    : null

  return {
    business: {
      name: profile.name,
      type: profile.type,
      period: inputs.period,
      employeesCount: profile.employeesCount,
      isSelfEmployed: profile.isSelfEmployed ?? false,
    },
    pnl: {
      revenue: inputs.revenue,
      cogs: inputs.cogs,
      grossProfit: snapshot.grossProfit,
      grossMarginPct: snapshot.grossMarginPct,
      fixedCosts: snapshot.fixedCosts,
      ebitda: snapshot.ebitda,
      ebitdaMarginPct: snapshot.ebitdaMarginPct,
      netProfit: snapshot.netProfit,
      netMarginPct: snapshot.netMarginPct,
      breakEvenRevenue: snapshot.breakEvenRevenue,
      safetyMarginPct: snapshot.safetyMarginPct,
    },
    cashFlow: {
      cashFlowThisPeriod: snapshot.cashFlow,
      cashBalance,
      runwayMonths,
    },
    debt: {
      debtServiceRatioPct: snapshot.debtServiceRatioPct,
      debtToEbitda: snapshot.debtToEbitda,
      dscr: snapshot.dscr,
    },
    marketing: {
      marketingEfficiencyPct: snapshot.marketingEfficiencyPct,
      romiPct: snapshot.romiPct,
    },
    history: sortedHistory.map((h) => ({ period: h.period, revenue: h.revenue, netProfit: buildFinancialSnapshot(h).netProfit })),
    forecast12mo: {
      revenue: forecastRevenue,
      netProfit: forecastNetProfit,
      endingCashBalance,
      salesGrowthRatePctPerMonth: forecastConfig.salesCountGrowthPct,
    },
    unitEconomics: cac !== null ? { cac, ltv, ltvCacRatio, paybackMonths } : null,
    workingCapital,
    diagnostics: {
      healthStatus: diagnostics.healthStatus,
      healthScore: diagnostics.healthScore,
      problems: diagnostics.problems.map((p) => ({ title: p.title, value: p.value, explanation: p.description })),
      actionPlan: diagnostics.actionPlan.map((a) => ({ action: a.action, expectedEffect: a.expectedEffect })),
    },
  }
}
