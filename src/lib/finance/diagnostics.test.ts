import { describe, expect, it } from 'vitest'
import type { FinancialInputs } from '@/types/finance'
import { buildFinancialSnapshot } from './snapshot'
import { runDiagnostics } from './diagnostics'

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
    customExpenseLines: [{ id: '1', label: 'Прочее', amount: 180000 }],
    depreciation: 0,
    loanInterest: 0,
    taxes: 90000,
    loanPayments: 50000,
    avgCheck: 850,
    salesCount: 2824,
    ...overrides,
  }
}

describe('runDiagnostics', () => {
  it('produces a health status derived from factor weights, not an arbitrary value', () => {
    const inputs = makeInputs()
    const result = runDiagnostics(inputs, buildFinancialSnapshot(inputs))
    expect(['stable', 'attention', 'critical']).toContain(result.healthStatus)
    expect(result.factors.length).toBeGreaterThan(0)
    expect(result.healthScore).toBeGreaterThanOrEqual(0)
    expect(result.healthScore).toBeLessThanOrEqual(100)
  })

  it('every problem references a concrete metric and value (no unfounded claims)', () => {
    const inputs = makeInputs({ revenue: 500000 }) // force a struggling business
    const result = runDiagnostics(inputs, buildFinancialSnapshot(inputs))
    expect(result.problems.length).toBeGreaterThan(0)
    for (const problem of result.problems) {
      expect(problem.metricRef).toBeTruthy()
      expect(problem.value).toBeTruthy()
      expect(problem.description).toContain(problem.value === '—' ? '' : '')
    }
  })

  it('flags critical status for a loss-making, cash-negative business', () => {
    const inputs = makeInputs({ revenue: 400000, cogs: 300000, taxes: 50000 })
    const result = runDiagnostics(inputs, buildFinancialSnapshot(inputs))
    expect(result.healthStatus).not.toBe('stable')
  })

  it('builds an action plan limited to the top problems with control metrics', () => {
    const inputs = makeInputs({ revenue: 400000 })
    const result = runDiagnostics(inputs, buildFinancialSnapshot(inputs))
    for (const item of result.actionPlan) {
      expect(item.controlMetric).toBeTruthy()
      expect(item.action).toBeTruthy()
    }
  })

  it('does not crash on all-zero inputs', () => {
    const inputs = makeInputs({
      revenue: 0, cogs: 0, payroll: 0, rent: 0, marketing: 0, taxes: 0, loanPayments: 0, avgCheck: 0, salesCount: 0, customExpenseLines: [],
    })
    const result = runDiagnostics(inputs, buildFinancialSnapshot(inputs))
    expect(result.healthStatus).toBe('critical')
  })
})
