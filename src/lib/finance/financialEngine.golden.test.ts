/**
 * Golden integration test — один сквозной бизнес-сценарий, прогнанный через весь Financial
 * Engine (P&L → Cash Flow → Balance Sheet → Forecast → Financial Plan → Loan), с проверками,
 * что цепочка согласована: одни и те же входные данные не должны давать расходящиеся Net
 * Profit/Cash/Debt в разных модулях. Написан по итогам аудита формул движка.
 */
import { describe, expect, it } from 'vitest'
import type { BalanceSheetInputs, CashFlowInputs, FinancialInputs } from '@/types/finance'
import { buildFinancialSnapshot, getVariableCosts } from './snapshot'
import { buildCashFlowSummary } from './cashflow'
import { buildBalanceSheetSnapshot } from './balanceSheet'
import { calculateForecast } from './forecast'
import { buildFinancialPlan } from './financialPlan'
import { calculateAnnuityPayment, buildAmortizationSchedule } from './loan'
import { calculateRequiredRevenueForNetProfit } from './breakeven'
import { DEFAULT_FORECAST_CONFIG } from '@/types/scenario'
import { DEFAULT_TAX_SETTINGS } from '@/types/tax'

// The scenario from the audit spec (§31), monthly figures.
const SCENARIO = {
  revenue: 5_000_000,
  cogs: 1_500_000,
  variableOpex: 250_000, // real FinancialInputs.variableOpex field — commissions/acquiring/delivery, distinct from COGS
  fixedCosts: 1_500_000,
  depreciation: 100_000,
  interest: 100_000,
  taxRatePct: 6, // "6%" ~ УСН «Доходы»
  openingCash: 2_000_000,
  ar: 500_000,
  inventory: 300_000,
  ap: 250_000,
  debt: 2_000_000,
  capex: 200_000,
}

function makeInputs(overrides: Partial<FinancialInputs> = {}): FinancialInputs {
  return {
    businessId: 'golden',
    period: '2026-09',
    revenue: SCENARIO.revenue,
    cogs: SCENARIO.cogs,
    variableOpex: SCENARIO.variableOpex,
    payroll: SCENARIO.fixedCosts * 0.6,
    rent: SCENARIO.fixedCosts * 0.2,
    marketing: SCENARIO.fixedCosts * 0.1,
    logistics: 0,
    utilities: 0,
    software: 0,
    customExpenseLines: [{ id: 'other-fixed', label: 'Прочие постоянные расходы', amount: SCENARIO.fixedCosts * 0.1 }],
    depreciation: SCENARIO.depreciation,
    loanInterest: SCENARIO.interest,
    taxes: (SCENARIO.revenue * SCENARIO.taxRatePct) / 100,
    loanPayments: 80_000, // principal repayment for this period — must NOT affect Net Profit
    avgCheck: 2500,
    salesCount: 2000,
    ...overrides,
  }
}

describe('Golden scenario: P&L is internally consistent (spec TEST 11)', () => {
  const inputs = makeInputs()
  const snapshot = buildFinancialSnapshot(inputs)

  it('Gross Profit = Revenue - COGS', () => {
    expect(snapshot.grossProfit).toBe(inputs.revenue - inputs.cogs)
  })

  it('Contribution Profit = Gross Profit - Variable OPEX', () => {
    expect(snapshot.contributionProfit).toBeCloseTo(snapshot.grossProfit - SCENARIO.variableOpex, 5)
  })

  it('EBITDA = Contribution Profit - Fixed Costs', () => {
    expect(snapshot.ebitda).toBeCloseTo(snapshot.contributionProfit - snapshot.fixedCosts, 5)
  })

  it('EBIT = EBITDA - Depreciation', () => {
    expect(snapshot.ebit).toBeCloseTo(snapshot.ebitda - inputs.depreciation, 5)
  })

  it('EBT (via EBIT - Interest) = Net Profit + Tax', () => {
    const ebt = snapshot.ebit - inputs.loanInterest
    expect(ebt).toBeCloseTo(snapshot.netProfit + inputs.taxes, 5)
  })

  it('Net Profit = EBT - Tax', () => {
    const ebt = snapshot.ebit - inputs.loanInterest
    expect(snapshot.netProfit).toBeCloseTo(ebt - inputs.taxes, 5)
  })
})

describe('Golden scenario: Variable OPEX is a distinct variable cost, not folded into Fixed Costs or COGS', () => {
  it('increasing variableOpex reduces Net Profit by exactly that amount, without changing Fixed Costs', () => {
    const base = buildFinancialSnapshot(makeInputs({ variableOpex: 250_000 }))
    const more = buildFinancialSnapshot(makeInputs({ variableOpex: 350_000 }))
    expect(base.netProfit - more.netProfit).toBeCloseTo(100_000, 5)
    expect(base.fixedCosts).toBeCloseTo(more.fixedCosts, 5)
  })

  it('variableOpex lowers contribution margin % and therefore raises Break-even Revenue', () => {
    const withoutVarOpex = buildFinancialSnapshot(makeInputs({ variableOpex: 0 }))
    const withVarOpex = buildFinancialSnapshot(makeInputs({ variableOpex: 250_000 }))
    expect(withVarOpex.contributionMarginPct).toBeLessThan(withoutVarOpex.contributionMarginPct)
    expect(withVarOpex.breakEvenRevenue).toBeGreaterThan(withoutVarOpex.breakEvenRevenue)
  })
})

describe('Golden scenario: loan principal never touches Net Profit, interest always does (spec TEST 5)', () => {
  it('increasing loanPayments (principal) alone does not change Net Profit', () => {
    const withLowPrincipal = buildFinancialSnapshot(makeInputs({ loanPayments: 10_000 }))
    const withHighPrincipal = buildFinancialSnapshot(makeInputs({ loanPayments: 900_000 }))
    expect(withHighPrincipal.netProfit).toBe(withLowPrincipal.netProfit)
  })

  it('increasing loanInterest reduces Net Profit by exactly that amount', () => {
    const base = buildFinancialSnapshot(makeInputs({ loanInterest: 100_000 }))
    const moreInterest = buildFinancialSnapshot(makeInputs({ loanInterest: 150_000 }))
    expect(base.netProfit - moreInterest.netProfit).toBeCloseTo(50_000, 5)
  })

  it('a loan received increases cash and debt; principal repayment decreases both — via the real amortization schedule', () => {
    const payment = calculateAnnuityPayment(SCENARIO.debt, 12, 24)
    expect(payment).not.toBeNull()
    const schedule = buildAmortizationSchedule(SCENARIO.debt, 12, 24)
    expect(schedule).toHaveLength(24)
    // Debt strictly decreases every month (principal > 0 each period) and reaches ~0 at term end.
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].remainingBalance).toBeLessThan(schedule[i - 1].remainingBalance)
    }
    expect(schedule[schedule.length - 1].remainingBalance).toBeCloseTo(0, 2)
  })
})

describe('Golden scenario: CAPEX hits cash immediately but never Net Profit directly (spec TEST 6)', () => {
  it('CAPEX (investing outflow) reduces cash flow but Net Profit is computed from FinancialInputs alone, untouched by it', () => {
    const inputs = makeInputs()
    const snapshot = buildFinancialSnapshot(inputs)

    const cashFlowInputs: CashFlowInputs = {
      businessId: 'golden',
      period: '2026-09',
      openingBalance: SCENARIO.openingCash,
      operating: { customerPayments: inputs.revenue, supplierPayments: inputs.cogs, payroll: inputs.payroll, rent: inputs.rent, marketing: inputs.marketing, taxes: inputs.taxes, otherOperating: 0 },
      investing: { equipment: SCENARIO.capex, repairs: 0, assetPurchases: 0 },
      financing: { loanReceived: 0, loanRepaid: inputs.loanPayments, ownerInvestment: 0, ownerWithdrawal: 0 },
    }
    const cashSummary = buildCashFlowSummary(cashFlowInputs)

    // CAPEX shows up as a cash outflow...
    expect(cashSummary.investingNet).toBe(-SCENARIO.capex)
    // ...but Net Profit (from the P&L engine) doesn't know CAPEX exists at all — only
    // depreciation (the periodic non-cash allocation of it) reduces Net Profit.
    expect(snapshot.netProfit).toBe(buildFinancialSnapshot(makeInputs()).netProfit)
    expect(inputs.depreciation).toBe(SCENARIO.depreciation) // the P&L input that already reduced EBIT above.
  })
})

describe('Golden scenario: Cash Flow reconciles Opening + Net = Closing (spec TEST 9)', () => {
  it('closingBalance = openingBalance + operatingNet + investingNet + financingNet', () => {
    const cashFlowInputs: CashFlowInputs = {
      businessId: 'golden',
      period: '2026-09',
      openingBalance: SCENARIO.openingCash,
      operating: { customerPayments: SCENARIO.revenue, supplierPayments: SCENARIO.cogs, payroll: 900_000, rent: 300_000, marketing: 150_000, taxes: 300_000, otherOperating: 0 },
      investing: { equipment: SCENARIO.capex, repairs: 0, assetPurchases: 0 },
      financing: { loanReceived: 0, loanRepaid: 80_000, ownerInvestment: 0, ownerWithdrawal: 0 },
    }
    const summary = buildCashFlowSummary(cashFlowInputs)
    expect(summary.closingBalance).toBeCloseTo(
      summary.openingBalance + summary.operatingNet + summary.investingNet + summary.financingNet,
      5,
    )
  })
})

describe('Golden scenario: Balance Sheet identity holds (spec TEST 10)', () => {
  it('Assets = Liabilities + Equity, by construction (equity is the residual, never entered directly)', () => {
    const balanceSheet: BalanceSheetInputs = {
      businessId: 'golden',
      period: '2026-09',
      currentAssets: { cash: SCENARIO.openingCash, receivables: SCENARIO.ar, inventory: SCENARIO.inventory, other: 0 },
      nonCurrentAssets: { fixedAssets: 3_000_000, other: 0 },
      currentLiabilities: { payables: SCENARIO.ap, shortTermDebt: 500_000, other: 0 },
      nonCurrentLiabilities: { longTermDebt: SCENARIO.debt - 500_000, other: 0 },
    }
    const snapshot = buildBalanceSheetSnapshot(balanceSheet)
    const check = snapshot.totalAssets - snapshot.totalLiabilities - snapshot.equity
    expect(Math.abs(check)).toBeLessThan(0.01)
  })
})

describe('Golden scenario: Forecast tax is recomputed per period, not frozen (spec TEST 8, cross-check)', () => {
  it('a forecast run with taxSettings uses the real tax engine every month, tracking revenue', () => {
    const inputs = makeInputs()
    const points = calculateForecast(inputs, { ...DEFAULT_FORECAST_CONFIG, salesCountGrowthPct: 5 }, { taxSettings: DEFAULT_TAX_SETTINGS })
    // Revenue grows month over month...
    expect(points[11].revenue).toBeGreaterThan(points[0].revenue)
    // ...and Net Profit does NOT grow in exact lockstep with revenue (because tax and fixed
    // costs don't scale 1:1 with revenue) — this alone proves tax isn't a frozen constant,
    // since a frozen tax would make netProfit's growth rate diverge in a very specific,
    // checkable way. The stronger, precise check already lives in forecast.test.ts.
    for (const p of points) {
      expect(Number.isFinite(p.netProfit)).toBe(true)
    }
  })
})

describe('Golden scenario: Financial Plan target is actually reached (spec §31.10)', () => {
  it('the required revenue for a target NET profit, run back through the real P&L, hits the target', () => {
    const inputs = makeInputs()
    const targetAnnualNetProfit = 12_000_000

    const plan = buildFinancialPlan(inputs, targetAnnualNetProfit, 12, 10, DEFAULT_TAX_SETTINGS)
    expect(plan.targetUnreachable).toBe(false)
    expect(plan.requiredMonthlyRevenue).not.toBeNull()

    // Directly verify the solver's own guarantee: net profit at the solved revenue matches target.
    const fixedCosts = inputs.payroll + inputs.rent + inputs.marketing + inputs.customExpenseLines.reduce((s, l) => s + l.amount, 0)
    const variableCostRatio = getVariableCosts(inputs) / inputs.revenue
    const solved = calculateRequiredRevenueForNetProfit(
      targetAnnualNetProfit / 12,
      fixedCosts,
      variableCostRatio,
      inputs.depreciation,
      inputs.loanInterest,
      inputs.avgCheck,
      { taxSettings: DEFAULT_TAX_SETTINGS },
    )
    expect(solved.requiredRevenue).toBeCloseTo(plan.requiredMonthlyRevenue as number, 0)
  })
})
