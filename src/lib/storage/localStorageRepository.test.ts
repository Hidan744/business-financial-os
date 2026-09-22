import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageFinanceRepository } from './localStorageRepository'
import type { BusinessState, MultiBusinessState } from './repository'

function makeLegacyBusinessState(): BusinessState {
  return {
    profile: {
      id: 'biz_legacy',
      name: 'Legacy Co',
      type: 'cafe',
      currency: 'RUB',
      period: 'month',
      employeesCount: 3,
      createdAt: new Date().toISOString(),
    },
    financialInputs: {
      businessId: 'biz_legacy',
      period: '2026-09',
      revenue: 100000,
      cogs: 30000,
      payroll: 20000,
      rent: 10000,
      marketing: 5000,
      logistics: 0,
      utilities: 0,
      software: 0,
      customExpenseLines: [],
      depreciation: 0,
      loanInterest: 0,
      taxes: 5000,
      loanPayments: 0,
      avgCheck: 500,
      salesCount: 200,
    },
    cashFlowInputs: {
      businessId: 'biz_legacy',
      period: '2026-09',
      openingBalance: 0,
      operating: { customerPayments: 0, supplierPayments: 0, payroll: 0, rent: 0, marketing: 0, taxes: 0, otherOperating: 0 },
      investing: { equipment: 0, repairs: 0, assetPurchases: 0 },
      financing: { loanReceived: 0, loanRepaid: 0, ownerInvestment: 0, ownerWithdrawal: 0 },
    },
    scenarios: [],
    forecastConfig: { salesCountGrowthPct: 0, seasonality: Array(12).fill(1), marketingBudgetTrendPct: 0, avgCheckGrowthPct: 0, employeesGrowth: 0 },
    aiHistory: [],
    history: [],
    targets: [],
    balanceSheet: {
      businessId: 'biz_legacy',
      period: '2026-09',
      currentAssets: { cash: 0, receivables: 0, inventory: 0, other: 0 },
      nonCurrentAssets: { fixedAssets: 0, other: 0 },
      currentLiabilities: { payables: 0, shortTermDebt: 0, other: 0 },
      nonCurrentLiabilities: { longTermDebt: 0, other: 0 },
    },
    employees: [],
    plannedHires: [],
    goals: [],
    unitEconomics: { purchaseFrequencyPerMonth: 1, monthlyChurnRatePct: 10, manualCac: null },
    taxSettings: {
      regime: 'usn_income',
      usnIncomeRatePct: 6,
      usnIncomeMinusExpensesRatePct: 15,
      osnProfitTaxRatePct: 20,
      npdRatePct: 6,
      patentAnnualCost: 0,
    },
    accessSettings: { protectedRoutes: [], ownerPin: null },
    onboardingComplete: true,
  }
}

describe('LocalStorageFinanceRepository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when nothing is stored', async () => {
    const repo = new LocalStorageFinanceRepository()
    expect(await repo.load()).toBeNull()
  })

  it('saves and loads multi-business state', async () => {
    const repo = new LocalStorageFinanceRepository()
    const state: MultiBusinessState = {
      activeBusinessId: 'biz_1',
      businesses: { biz_1: makeLegacyBusinessState() },
    }
    await repo.save(state)
    const loaded = await repo.load()
    expect(loaded?.activeBusinessId).toBe('biz_1')
    expect(loaded?.businesses.biz_1.profile.name).toBe('Legacy Co')
  })

  it('migrates a legacy single-business record into the multi-business shape without data loss', async () => {
    const legacy = makeLegacyBusinessState()
    localStorage.setItem('bfos:state:v1', JSON.stringify(legacy))

    const repo = new LocalStorageFinanceRepository()
    const loaded = await repo.load()

    expect(loaded?.activeBusinessId).toBe('biz_legacy')
    expect(loaded?.businesses.biz_legacy.profile.name).toBe('Legacy Co')
    expect(loaded?.businesses.biz_legacy.financialInputs.revenue).toBe(100000)
    // legacy key is cleaned up after migration
    expect(localStorage.getItem('bfos:state:v1')).toBeNull()
    // and the migrated shape is now persisted under the new key
    expect(localStorage.getItem('bfos:state:v2')).not.toBeNull()
  })

  it('clear() removes both the current and legacy keys', async () => {
    localStorage.setItem('bfos:state:v1', JSON.stringify(makeLegacyBusinessState()))
    localStorage.setItem('bfos:state:v2', JSON.stringify({ activeBusinessId: null, businesses: {} }))
    const repo = new LocalStorageFinanceRepository()
    await repo.clear()
    expect(localStorage.getItem('bfos:state:v1')).toBeNull()
    expect(localStorage.getItem('bfos:state:v2')).toBeNull()
  })
})
