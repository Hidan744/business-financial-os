import { create } from 'zustand'
import type { BusinessProfile } from '@/types/business'
import type { CashFlowInputs, CustomExpenseLine, FinancialInputs } from '@/types/finance'
import type { AiCfoMessage } from '@/types/ai'
import type { ForecastConfig, Scenario } from '@/types/scenario'
import { STANDARD_SCENARIOS, DEFAULT_FORECAST_CONFIG } from '@/types/scenario'
import { financeRepository } from '@/lib/storage/localStorageRepository'
import type { BusinessState, MultiBusinessState } from '@/lib/storage/repository'
import { createUrbanCoffeeDemo } from '@/lib/demo/urbanCoffee'
import { generateId } from '@/lib/id'

interface Store {
  status: 'loading' | 'onboarding' | 'ready'
  businesses: Record<string, BusinessState>
  activeBusinessId: string | null
  businessList: BusinessProfile[]

  // Удобный доступ к активному бизнесу — большинство страниц читают именно эти поля.
  profile: BusinessProfile | null
  financialInputs: FinancialInputs | null
  cashFlowInputs: CashFlowInputs | null
  scenarios: Scenario[]
  forecastConfig: ForecastConfig
  aiHistory: AiCfoMessage[]

  hydrate: () => Promise<void>
  loadDemo: () => Promise<void>
  /** Добавляет новый бизнес (первый — через онбординг, или ещё один через переключатель) и делает его активным. */
  completeOnboarding: (profile: BusinessProfile, financialInputs: FinancialInputs) => Promise<void>
  switchBusiness: (businessId: string) => Promise<void>
  removeBusiness: (businessId: string) => Promise<void>
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

function deriveActiveFields(businesses: Record<string, BusinessState>, activeBusinessId: string | null) {
  const active = activeBusinessId ? businesses[activeBusinessId] : undefined
  return {
    profile: active?.profile ?? null,
    financialInputs: active?.financialInputs ?? null,
    cashFlowInputs: active?.cashFlowInputs ?? null,
    scenarios: active?.scenarios ?? STANDARD_SCENARIOS,
    forecastConfig: active?.forecastConfig ?? DEFAULT_FORECAST_CONFIG,
    aiHistory: active?.aiHistory ?? [],
  }
}

function deriveBusinessList(businesses: Record<string, BusinessState>): BusinessProfile[] {
  return Object.values(businesses)
    .map((b) => b.profile)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

async function persist(get: () => Store) {
  const { businesses, activeBusinessId } = get()
  const state: MultiBusinessState = { activeBusinessId, businesses }
  await financeRepository.save(state)
}

/** Обновляет данные активного бизнеса, пересчитывает производные поля и сохраняет. */
async function mutateActiveBusiness(
  get: () => Store,
  set: (partial: Partial<Store>) => void,
  updater: (business: BusinessState) => BusinessState,
) {
  const { businesses, activeBusinessId } = get()
  if (!activeBusinessId || !businesses[activeBusinessId]) return
  const nextBusinesses = { ...businesses, [activeBusinessId]: updater(businesses[activeBusinessId]) }
  set({ businesses: nextBusinesses, ...deriveActiveFields(nextBusinesses, activeBusinessId) })
  await persist(get)
}

export const useBusinessStore = create<Store>((set, get) => ({
  status: 'loading',
  businesses: {},
  activeBusinessId: null,
  businessList: [],
  profile: null,
  financialInputs: null,
  cashFlowInputs: null,
  scenarios: STANDARD_SCENARIOS,
  forecastConfig: DEFAULT_FORECAST_CONFIG,
  aiHistory: [],

  hydrate: async () => {
    const saved = await financeRepository.load()
    const businesses = saved?.businesses ?? {}
    const hasBusinesses = Object.keys(businesses).length > 0
    const activeBusinessId = saved?.activeBusinessId && businesses[saved.activeBusinessId] ? saved.activeBusinessId : Object.keys(businesses)[0] ?? null

    set({
      status: hasBusinesses ? 'ready' : 'onboarding',
      businesses,
      activeBusinessId,
      businessList: deriveBusinessList(businesses),
      ...deriveActiveFields(businesses, activeBusinessId),
    })
  },

  loadDemo: async () => {
    const demo = createUrbanCoffeeDemo()
    const demoId = demo.profile.id
    const businesses = { ...get().businesses, [demoId]: demo }
    set({
      status: 'ready',
      businesses,
      activeBusinessId: demoId,
      businessList: deriveBusinessList(businesses),
      ...deriveActiveFields(businesses, demoId),
    })
    await persist(get)
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

    const newBusiness: BusinessState = {
      profile,
      financialInputs,
      cashFlowInputs,
      scenarios: STANDARD_SCENARIOS,
      forecastConfig: DEFAULT_FORECAST_CONFIG,
      aiHistory: [],
      onboardingComplete: true,
    }

    const businesses = { ...get().businesses, [profile.id]: newBusiness }
    set({
      status: 'ready',
      businesses,
      activeBusinessId: profile.id,
      businessList: deriveBusinessList(businesses),
      ...deriveActiveFields(businesses, profile.id),
    })
    await persist(get)
  },

  switchBusiness: async (businessId) => {
    const { businesses } = get()
    if (!businesses[businessId]) return
    set({ activeBusinessId: businessId, ...deriveActiveFields(businesses, businessId) })
    await persist(get)
  },

  removeBusiness: async (businessId) => {
    const { businesses, activeBusinessId } = get()
    if (!businesses[businessId]) return
    const nextBusinesses = { ...businesses }
    delete nextBusinesses[businessId]
    const remainingIds = Object.keys(nextBusinesses)
    const nextActiveId = activeBusinessId === businessId ? (remainingIds[0] ?? null) : activeBusinessId

    set({
      status: remainingIds.length > 0 ? 'ready' : 'onboarding',
      businesses: nextBusinesses,
      activeBusinessId: nextActiveId,
      businessList: deriveBusinessList(nextBusinesses),
      ...deriveActiveFields(nextBusinesses, nextActiveId),
    })
    await persist(get)
  },

  updateFinancialInputs: async (patch) => {
    await mutateActiveBusiness(get, set, (b) => ({ ...b, financialInputs: { ...b.financialInputs, ...patch } }))
  },

  updateCashFlowInputs: async (patch) => {
    await mutateActiveBusiness(get, set, (b) => ({ ...b, cashFlowInputs: { ...b.cashFlowInputs, ...patch } }))
  },

  addExpenseLine: async (line) => {
    const newLine = { ...line, id: generateId('exp') }
    await mutateActiveBusiness(get, set, (b) => ({
      ...b,
      financialInputs: { ...b.financialInputs, customExpenseLines: [...b.financialInputs.customExpenseLines, newLine] },
    }))
  },

  removeExpenseLine: async (id) => {
    await mutateActiveBusiness(get, set, (b) => ({
      ...b,
      financialInputs: {
        ...b.financialInputs,
        customExpenseLines: b.financialInputs.customExpenseLines.filter((l) => l.id !== id),
      },
    }))
  },

  updateProfile: async (patch) => {
    await mutateActiveBusiness(get, set, (b) => ({ ...b, profile: { ...b.profile, ...patch } }))
    set({ businessList: deriveBusinessList(get().businesses) })
  },

  setForecastConfig: async (config) => {
    await mutateActiveBusiness(get, set, (b) => ({ ...b, forecastConfig: config }))
  },

  addAiMessage: async (message) => {
    await mutateActiveBusiness(get, set, (b) => ({ ...b, aiHistory: [...b.aiHistory, message] }))
  },

  resetAll: async () => {
    await financeRepository.clear()
    set({
      status: 'onboarding',
      businesses: {},
      activeBusinessId: null,
      businessList: [],
      profile: null,
      financialInputs: null,
      cashFlowInputs: null,
      scenarios: STANDARD_SCENARIOS,
      forecastConfig: DEFAULT_FORECAST_CONFIG,
      aiHistory: [],
    })
  },
}))
