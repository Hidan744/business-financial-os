import { create } from 'zustand'
import type { BusinessProfile } from '@/types/business'
import type { CashFlowInputs, CustomExpenseLine, FinancialInputs } from '@/types/finance'
import type { AiCfoMessage } from '@/types/ai'
import type { ForecastConfig, Scenario } from '@/types/scenario'
import { STANDARD_SCENARIOS, DEFAULT_FORECAST_CONFIG } from '@/types/scenario'
import { financeRepository } from '@/lib/storage/localStorageRepository'
import type { BusinessState } from '@/lib/storage/repository'
import { createUrbanCoffeeDemo } from '@/lib/demo/urbanCoffee'
import { generateId } from '@/lib/id'

interface Store {
  status: 'loading' | 'onboarding' | 'ready'
  profile: BusinessProfile | null
  financialInputs: FinancialInputs | null
  cashFlowInputs: CashFlowInputs | null
  scenarios: Scenario[]
  forecastConfig: ForecastConfig
  aiHistory: AiCfoMessage[]

  hydrate: () => Promise<void>
  loadDemo: () => Promise<void>
  completeOnboarding: (profile: BusinessProfile, financialInputs: FinancialInputs) => Promise<void>
  updateFinancialInputs: (patch: Partial<FinancialInputs>) => Promise<void>
  updateCashFlowInputs: (patch: Partial<CashFlowInputs>) => Promise<void>
  addExpenseLine: (line: Omit<CustomExpenseLine, 'id'>) => Promise<void>
  removeExpenseLine: (id: string) => Promise<void>
  updateProfile: (patch: Partial<BusinessProfile>) => Promise<void>
  setForecastConfig: (config: ForecastConfig) => Promise<void>
  addAiMessage: (message: AiCfoMessage) => Promise<void>
  resetAll: () => Promise<void>
}

function emptyCashFlow(businessId: string, period: string): CashFlowInputs {
  return {
    businessId,
    period,
    openingBalance: 0,
    operating: {
      customerPayments: 0,
      supplierPayments: 0,
      payroll: 0,
      rent: 0,
      marketing: 0,
      taxes: 0,
      otherOperating: 0,
    },
    investing: { equipment: 0, repairs: 0, assetPurchases: 0 },
    financing: { loanReceived: 0, loanRepaid: 0, ownerInvestment: 0, ownerWithdrawal: 0 },
  }
}

async function persist(get: () => Store) {
  const s = get()
  if (!s.profile || !s.financialInputs || !s.cashFlowInputs) return
  const state: BusinessState = {
    profile: s.profile,
    financialInputs: s.financialInputs,
    cashFlowInputs: s.cashFlowInputs,
    scenarios: s.scenarios,
    forecastConfig: s.forecastConfig,
    aiHistory: s.aiHistory,
    onboardingComplete: true,
  }
  await financeRepository.save(state)
}

export const useBusinessStore = create<Store>((set, get) => ({
  status: 'loading',
  profile: null,
  financialInputs: null,
  cashFlowInputs: null,
  scenarios: STANDARD_SCENARIOS,
  forecastConfig: DEFAULT_FORECAST_CONFIG,
  aiHistory: [],

  hydrate: async () => {
    const saved = await financeRepository.load()
    if (saved) {
      set({
        status: 'ready',
        profile: saved.profile,
        financialInputs: saved.financialInputs,
        cashFlowInputs: saved.cashFlowInputs,
        scenarios: saved.scenarios,
        forecastConfig: saved.forecastConfig,
        aiHistory: saved.aiHistory,
      })
    } else {
      set({ status: 'onboarding' })
    }
  },

  loadDemo: async () => {
    const demo = createUrbanCoffeeDemo()
    set({
      status: 'ready',
      profile: demo.profile,
      financialInputs: demo.financialInputs,
      cashFlowInputs: demo.cashFlowInputs,
      scenarios: demo.scenarios,
      forecastConfig: demo.forecastConfig,
      aiHistory: demo.aiHistory,
    })
    await financeRepository.save(demo)
  },

  completeOnboarding: async (profile, financialInputs) => {
    const cashFlowInputs = emptyCashFlow(profile.id, financialInputs.period)
    cashFlowInputs.operating.customerPayments = financialInputs.revenue
    cashFlowInputs.operating.supplierPayments = financialInputs.cogs
    cashFlowInputs.operating.payroll = financialInputs.payroll
    cashFlowInputs.operating.rent = financialInputs.rent
    cashFlowInputs.operating.marketing = financialInputs.marketing
    cashFlowInputs.operating.taxes = financialInputs.taxes
    cashFlowInputs.operating.otherOperating =
      financialInputs.logistics + financialInputs.utilities + financialInputs.software
    cashFlowInputs.financing.loanRepaid = financialInputs.loanPayments

    set({
      status: 'ready',
      profile,
      financialInputs,
      cashFlowInputs,
      scenarios: STANDARD_SCENARIOS,
      forecastConfig: DEFAULT_FORECAST_CONFIG,
      aiHistory: [],
    })
    await persist(get)
  },

  updateFinancialInputs: async (patch) => {
    const current = get().financialInputs
    if (!current) return
    set({ financialInputs: { ...current, ...patch } })
    await persist(get)
  },

  updateCashFlowInputs: async (patch) => {
    const current = get().cashFlowInputs
    if (!current) return
    set({ cashFlowInputs: { ...current, ...patch } })
    await persist(get)
  },

  addExpenseLine: async (line) => {
    const current = get().financialInputs
    if (!current) return
    const newLine = { ...line, id: generateId('exp') }
    set({ financialInputs: { ...current, customExpenseLines: [...current.customExpenseLines, newLine] } })
    await persist(get)
  },

  removeExpenseLine: async (id) => {
    const current = get().financialInputs
    if (!current) return
    set({
      financialInputs: {
        ...current,
        customExpenseLines: current.customExpenseLines.filter((l) => l.id !== id),
      },
    })
    await persist(get)
  },

  updateProfile: async (patch) => {
    const current = get().profile
    if (!current) return
    set({ profile: { ...current, ...patch } })
    await persist(get)
  },

  setForecastConfig: async (config) => {
    set({ forecastConfig: config })
    await persist(get)
  },

  addAiMessage: async (message) => {
    set({ aiHistory: [...get().aiHistory, message] })
    await persist(get)
  },

  resetAll: async () => {
    await financeRepository.clear()
    set({
      status: 'onboarding',
      profile: null,
      financialInputs: null,
      cashFlowInputs: null,
      scenarios: STANDARD_SCENARIOS,
      forecastConfig: DEFAULT_FORECAST_CONFIG,
      aiHistory: [],
    })
  },
}))
