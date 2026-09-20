import { describe, expect, it } from 'vitest'
import type { FinancialInputs } from '@/types/finance'
import { buildFinancialSnapshot } from '@/lib/finance/snapshot'
import { runDiagnostics } from '@/lib/finance/diagnostics'
import { answerQuestion } from './cfoEngine'

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

function setup(overrides: Partial<FinancialInputs> = {}) {
  const inputs = makeInputs(overrides)
  const snapshot = buildFinancialSnapshot(inputs)
  const diagnostics = runDiagnostics(inputs, snapshot)
  return { inputs, snapshot, diagnostics }
}

describe('answerQuestion — required revenue for a target profit', () => {
  it('computes required revenue from the target profit question', () => {
    const { inputs, snapshot, diagnostics } = setup()
    const result = answerQuestion('Какую выручку мне нужно сделать для прибыли 500000?', inputs, snapshot, diagnostics, 8)
    expect(result.answer).toBeDefined()
    expect(result.answer!.shortAnswer).toMatch(/500.000/)
  })

  it('asks for the missing number when no target amount is given', () => {
    const { inputs, snapshot, diagnostics } = setup()
    const result = answerQuestion('Какую выручку мне нужно сделать для прибыли?', inputs, snapshot, diagnostics, 8)
    expect(result.missingData).toBeDefined()
  })
})

describe('answerQuestion — scenario what-if', () => {
  it('answers a marketing increase scenario with a real before/after comparison', () => {
    const { inputs, snapshot, diagnostics } = setup()
    const result = answerQuestion('Что будет, если я увеличу рекламу на 30%?', inputs, snapshot, diagnostics, 8)
    expect(result.answer).toBeDefined()
    expect(result.answer!.calculation).toBeTruthy()
  })
})

describe('answerQuestion — hiring', () => {
  it('requires employee count data when unavailable', () => {
    const { inputs, snapshot, diagnostics } = setup()
    const result = answerQuestion('Можно ли мне нанять ещё сотрудника?', inputs, snapshot, diagnostics, 0)
    expect(result.missingData).toBeDefined()
  })

  it('answers using the real payroll and employee count', () => {
    const { inputs, snapshot, diagnostics } = setup()
    const result = answerQuestion('Можно ли мне нанять ещё сотрудника?', inputs, snapshot, diagnostics, 8)
    expect(result.answer).toBeDefined()
  })
})

describe('answerQuestion — biggest cost driver', () => {
  it('identifies the largest expense line as the top money loss', () => {
    const { inputs, snapshot, diagnostics } = setup()
    const result = answerQuestion('Где я теряю больше всего денег?', inputs, snapshot, diagnostics, 8)
    expect(result.answer).toBeDefined()
    expect(result.answer!.shortAnswer).toMatch(/Себестоимость/)
  })
})

describe('answerQuestion — unmatched question', () => {
  it('returns missingData instead of fabricating an answer', () => {
    const { inputs, snapshot, diagnostics } = setup()
    const result = answerQuestion('Какая погода в Москве?', inputs, snapshot, diagnostics, 8)
    expect(result.answer).toBeUndefined()
    expect(result.missingData).toBeDefined()
  })
})
