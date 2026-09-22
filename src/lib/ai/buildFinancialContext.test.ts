import { describe, expect, it } from 'vitest'
import type { FinancialInputs } from '@/types/finance'
import { buildFinancialContext } from './buildFinancialContext'
import { buildFinancialSnapshot } from '@/lib/finance/snapshot'
import { runDiagnostics } from '@/lib/finance/diagnostics'
import { DEFAULT_FORECAST_CONFIG } from '@/types/scenario'
import { DEFAULT_UNIT_ECONOMICS_ASSUMPTIONS } from '@/types/unitEconomics'
import type { BusinessProfile } from '@/types/business'

function makeInputs(overrides: Partial<FinancialInputs> = {}): FinancialInputs {
  return {
    businessId: 'b1',
    period: '2026-09',
    revenue: 2400000,
    cogs: 720000,
    payroll: 520000,
    rent: 220000,
    marketing: 150000,
    logistics: 0,
    utilities: 0,
    software: 0,
    customExpenseLines: [],
    depreciation: 0,
    loanInterest: 0,
    taxes: 90000,
    loanPayments: 50000,
    avgCheck: 850,
    salesCount: 2824,
    ...overrides,
  }
}

const profile: BusinessProfile = {
  id: 'b1',
  name: 'Urban Coffee',
  type: 'cafe',
  currency: 'RUB',
  period: 'month',
  employeesCount: 8,
  createdAt: new Date().toISOString(),
}

describe('buildFinancialContext', () => {
  it('never leaks NaN/undefined into the JSON payload the LLM receives', () => {
    const inputs = makeInputs()
    const snapshot = buildFinancialSnapshot(inputs)
    const diagnostics = runDiagnostics(inputs, snapshot)

    const context = buildFinancialContext({
      profile,
      inputs,
      snapshot,
      diagnostics,
      history: [],
      balanceSheet: null,
      cashFlowInputs: null,
      forecastConfig: DEFAULT_FORECAST_CONFIG,
      unitEconomics: DEFAULT_UNIT_ECONOMICS_ASSUMPTIONS,
    })

    const serialized = JSON.stringify(context)
    expect(serialized).not.toContain('NaN')
    expect(serialized).not.toContain('undefined')
    // round-trips cleanly through JSON (what actually gets sent over the wire)
    expect(() => JSON.parse(serialized)).not.toThrow()
  })

  it('carries through the real P&L numbers unchanged (LLM never sees recomputed figures)', () => {
    const inputs = makeInputs()
    const snapshot = buildFinancialSnapshot(inputs)
    const diagnostics = runDiagnostics(inputs, snapshot)

    const context = buildFinancialContext({
      profile,
      inputs,
      snapshot,
      diagnostics,
      history: [],
      balanceSheet: null,
      cashFlowInputs: null,
      forecastConfig: DEFAULT_FORECAST_CONFIG,
      unitEconomics: DEFAULT_UNIT_ECONOMICS_ASSUMPTIONS,
    })

    expect(context.pnl.revenue).toBe(inputs.revenue)
    expect(context.pnl.netProfit).toBe(snapshot.netProfit)
    expect(context.pnl.ebitda).toBe(snapshot.ebitda)
  })

  it('cashFlow/debt fields are null when there is no balance sheet / cash flow data, not fabricated', () => {
    const inputs = makeInputs()
    const snapshot = buildFinancialSnapshot(inputs) // no context -> debtToEbitda is null (see snapshot.test.ts)
    const diagnostics = runDiagnostics(inputs, snapshot)

    const context = buildFinancialContext({
      profile,
      inputs,
      snapshot,
      diagnostics,
      history: [],
      balanceSheet: null,
      cashFlowInputs: null,
      forecastConfig: DEFAULT_FORECAST_CONFIG,
      unitEconomics: DEFAULT_UNIT_ECONOMICS_ASSUMPTIONS,
    })

    expect(context.cashFlow.cashBalance).toBeNull()
    expect(context.cashFlow.runwayMonths).toBeNull()
    expect(context.debt.debtToEbitda).toBeNull()
    expect(context.workingCapital).toBeNull()
  })

  it('includes at most the last 6 historical periods, sorted oldest to newest', () => {
    const inputs = makeInputs()
    const snapshot = buildFinancialSnapshot(inputs)
    const diagnostics = runDiagnostics(inputs, snapshot)
    const history = Array.from({ length: 10 }, (_, i) =>
      makeInputs({ period: `2025-${String(i + 1).padStart(2, '0')}`, revenue: 1000000 + i * 10000 }),
    )

    const context = buildFinancialContext({
      profile,
      inputs,
      snapshot,
      diagnostics,
      history,
      balanceSheet: null,
      cashFlowInputs: null,
      forecastConfig: DEFAULT_FORECAST_CONFIG,
      unitEconomics: DEFAULT_UNIT_ECONOMICS_ASSUMPTIONS,
    })

    expect(context.history).toHaveLength(6)
    expect(context.history[0].period).toBe('2025-05')
    expect(context.history[5].period).toBe('2025-10')
  })

  it('reflects the current forecastConfig growth rate rather than recomputing its own', () => {
    const inputs = makeInputs()
    const snapshot = buildFinancialSnapshot(inputs)
    const diagnostics = runDiagnostics(inputs, snapshot)

    const context = buildFinancialContext({
      profile,
      inputs,
      snapshot,
      diagnostics,
      history: [],
      balanceSheet: null,
      cashFlowInputs: null,
      forecastConfig: { ...DEFAULT_FORECAST_CONFIG, salesCountGrowthPct: 4.2 },
      unitEconomics: DEFAULT_UNIT_ECONOMICS_ASSUMPTIONS,
    })

    expect(context.forecast12mo.salesGrowthRatePctPerMonth).toBe(4.2)
    expect(context.forecast12mo.revenue).toBeGreaterThan(inputs.revenue) // 12mo sum > 1 month at positive growth
  })

  it('unitEconomics is null when there is no way to estimate CAC (no marketing spend, no sales)', () => {
    const inputs = makeInputs({ marketing: 0, salesCount: 0 })
    const snapshot = buildFinancialSnapshot(inputs)
    const diagnostics = runDiagnostics(inputs, snapshot)

    const context = buildFinancialContext({
      profile,
      inputs,
      snapshot,
      diagnostics,
      history: [],
      balanceSheet: null,
      cashFlowInputs: null,
      forecastConfig: DEFAULT_FORECAST_CONFIG,
      unitEconomics: DEFAULT_UNIT_ECONOMICS_ASSUMPTIONS,
    })

    expect(context.unitEconomics).toBeNull()
  })
})
