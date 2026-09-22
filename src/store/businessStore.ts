import { create } from 'zustand'
import type { BusinessProfile } from '@/types/business'
import type { BalanceSheetInputs, CashFlowInputs, CustomExpenseLine, FinancialInputs, PeriodTarget } from '@/types/finance'
import type { AiCfoMessage } from '@/types/ai'
import type { Employee, PlannedHire } from '@/types/hr'
import type { Goal } from '@/types/goal'
import type { UnitEconomicsAssumptions } from '@/types/unitEconomics'
import { DEFAULT_UNIT_ECONOMICS_ASSUMPTIONS } from '@/types/unitEconomics'
import type { TaxSettings } from '@/types/tax'
import { DEFAULT_TAX_SETTINGS } from '@/types/tax'
import type { AccessSettings } from '@/types/access'
import { DEFAULT_ACCESS_SETTINGS } from '@/types/access'
import type { ForecastConfig, Scenario } from '@/types/scenario'
import { STANDARD_SCENARIOS, DEFAULT_FORECAST_CONFIG } from '@/types/scenario'
import { getActiveRepository } from '@/lib/storage/activeRepository'
import type { BusinessState, MultiBusinessState } from '@/lib/storage/repository'
import { getBusinessRole, getMyAllowedDomains, supabaseFinanceRepository } from '@/lib/storage/supabaseFinanceRepository'
import { createUrbanCoffeeDemo } from '@/lib/demo/urbanCoffee'
import { emptyBalanceSheet } from '@/lib/finance/balanceSheet'
import { generateId } from '@/lib/id'
import type { BusinessRole, TeamDomain } from '@/types/teamAccess'

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
  history: FinancialInputs[]
  targets: PeriodTarget[]
  balanceSheet: BalanceSheetInputs | null
  employees: Employee[]
  plannedHires: PlannedHire[]
  goals: Goal[]
  unitEconomics: UnitEconomicsAssumptions
  taxSettings: TaxSettings
  accessSettings: AccessSettings
  /**
   * Роль текущего пользователя в активном бизнесе (только для Supabase-бизнесов —
   * null в гостевом/локальном режиме, там реальной multi-user модели нет).
   * 'owner' — видит и пишет всё. 'member' — только домены из myAllowedDomains,
   * запись идёт через scoped RPC, а не общий save() (см. mutateActiveBusiness).
   */
  myRole: BusinessRole | null
  myAllowedDomains: TeamDomain[]

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
  /** Переносит текущий период в историю (факт) и открывает новый активный период. */
  closeCurrentPeriod: (nextPeriod: string) => Promise<void>
  /** Добавляет/перезаписывает запись истории вручную (backfill прошлых месяцев). */
  upsertHistoricalRecord: (record: FinancialInputs) => Promise<void>
  /** Массово добавляет/перезаписывает несколько записей истории разом (импорт из Excel). */
  importHistoricalRecords: (records: FinancialInputs[]) => Promise<void>
  removeHistoricalRecord: (period: string) => Promise<void>
  setTarget: (target: PeriodTarget) => Promise<void>
  removeTarget: (period: string) => Promise<void>
  updateBalanceSheet: (patch: Partial<BalanceSheetInputs>) => Promise<void>
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>
  updateEmployee: (id: string, patch: Partial<Omit<Employee, 'id'>>) => Promise<void>
  removeEmployee: (id: string) => Promise<void>
  addPlannedHire: (hire: Omit<PlannedHire, 'id'>) => Promise<void>
  removePlannedHire: (id: string) => Promise<void>
  /** Записывает ФОТ, посчитанный по штату, в financialInputs.payroll. */
  syncPayrollFromEmployees: () => Promise<void>
  addGoal: (goal: Omit<Goal, 'id'>) => Promise<void>
  removeGoal: (id: string) => Promise<void>
  updateUnitEconomics: (patch: Partial<UnitEconomicsAssumptions>) => Promise<void>
  updateTaxSettings: (patch: Partial<TaxSettings>) => Promise<void>
  updateAccessSettings: (patch: Partial<AccessSettings>) => Promise<void>
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

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7)
}

/**
 * salesCountGrowthPct заменил monthlyGrowthRatePct (тот же смысл — рост количества продаж,
 * честное название). Записи, сохранённые до переименования, читают старое поле как запасной вариант.
 */
function normalizeForecastConfig(config: ForecastConfig | undefined): ForecastConfig {
  const legacy = config as (Partial<ForecastConfig> & { monthlyGrowthRatePct?: number }) | undefined
  if (!legacy) return DEFAULT_FORECAST_CONFIG
  return {
    ...DEFAULT_FORECAST_CONFIG,
    ...legacy,
    salesCountGrowthPct: legacy.salesCountGrowthPct ?? legacy.monthlyGrowthRatePct ?? DEFAULT_FORECAST_CONFIG.salesCountGrowthPct,
  }
}

function deriveActiveFields(businesses: Record<string, BusinessState>, activeBusinessId: string | null) {
  const active = activeBusinessId ? businesses[activeBusinessId] : undefined
  return {
    profile: active?.profile ?? null,
    financialInputs: active?.financialInputs ?? null,
    cashFlowInputs: active?.cashFlowInputs ?? null,
    scenarios: active?.scenarios ?? STANDARD_SCENARIOS,
    forecastConfig: normalizeForecastConfig(active?.forecastConfig),
    aiHistory: active?.aiHistory ?? [],
    // ?? [] / ?? emptyBalanceSheet(...) — защита от записей, сохранённых до появления
    // истории/целей/баланса (старая форма BusinessState).
    history: active?.history ?? [],
    targets: active?.targets ?? [],
    // active.financialInputs может отсутствовать у участника команды без домена 'finance'
    // (get_business_view отдаёт только разрешённые ключи) — тогда просто берём текущий месяц.
    balanceSheet: active
      ? (active.balanceSheet ?? emptyBalanceSheet(active.profile.id, active.financialInputs?.period ?? currentPeriod()))
      : null,
    employees: active?.employees ?? [],
    plannedHires: active?.plannedHires ?? [],
    goals: active?.goals ?? [],
    unitEconomics: active?.unitEconomics ?? DEFAULT_UNIT_ECONOMICS_ASSUMPTIONS,
    taxSettings: active?.taxSettings ?? DEFAULT_TAX_SETTINGS,
    accessSettings: active?.accessSettings ?? DEFAULT_ACCESS_SETTINGS,
    myRole: activeBusinessId ? getBusinessRole(activeBusinessId) : null,
    myAllowedDomains: activeBusinessId ? getMyAllowedDomains(activeBusinessId) : [],
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
  await getActiveRepository().save(state)
}

/** Обновляет данные активного бизнеса, пересчитывает производные поля и сохраняет. */
async function mutateActiveBusiness(
  get: () => Store,
  set: (partial: Partial<Store>) => void,
  updater: (business: BusinessState) => BusinessState,
) {
  const { businesses, activeBusinessId } = get()
  if (!activeBusinessId || !businesses[activeBusinessId]) return
  const current = businesses[activeBusinessId]
  const normalized: BusinessState = {
    ...current,
    forecastConfig: normalizeForecastConfig(current.forecastConfig),
    history: current.history ?? [],
    targets: current.targets ?? [],
    balanceSheet: current.balanceSheet ?? emptyBalanceSheet(current.profile.id, current.financialInputs?.period ?? currentPeriod()),
    employees: current.employees ?? [],
    plannedHires: current.plannedHires ?? [],
    goals: current.goals ?? [],
    unitEconomics: current.unitEconomics ?? DEFAULT_UNIT_ECONOMICS_ASSUMPTIONS,
    taxSettings: current.taxSettings ?? DEFAULT_TAX_SETTINGS,
    accessSettings: current.accessSettings ?? DEFAULT_ACCESS_SETTINGS,
  }
  const updated = updater(normalized)
  const nextBusinesses = { ...businesses, [activeBusinessId]: updated }
  set({ businesses: nextBusinesses, ...deriveActiveFields(nextBusinesses, activeBusinessId) })

  const role = getBusinessRole(activeBusinessId)
  if (role === 'member') {
    // Участник не может сохранить весь blob (RLS это и не позволит) — пишем только то,
    // что реально изменилось, по одному верхнеуровневому ключу за раз через scoped RPC.
    // Сравнение по ссылке работает надёжно, потому что все update-действия в этом сторе
    // собирают следующее состояние через спред ({...b, key: ...}) — непотронутые ключи
    // всегда сохраняют ту же ссылку, изменённые — всегда получают новую.
    const keys = Object.keys(updated) as (keyof BusinessState)[]
    for (const key of keys) {
      if (updated[key] !== normalized[key]) {
        await supabaseFinanceRepository.saveMemberSection(activeBusinessId, key, updated[key])
      }
    }
    return
  }

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
  history: [],
  targets: [],
  balanceSheet: null,
  employees: [],
  plannedHires: [],
  goals: [],
  unitEconomics: DEFAULT_UNIT_ECONOMICS_ASSUMPTIONS,
  taxSettings: DEFAULT_TAX_SETTINGS,
  accessSettings: DEFAULT_ACCESS_SETTINGS,
  myRole: null,
  myAllowedDomains: [],

  hydrate: async () => {
    const saved = await getActiveRepository().load()
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
      history: [],
      targets: [],
      balanceSheet: emptyBalanceSheet(profile.id, financialInputs.period),
      employees: [],
      plannedHires: [],
      goals: [],
      unitEconomics: DEFAULT_UNIT_ECONOMICS_ASSUMPTIONS,
      taxSettings: DEFAULT_TAX_SETTINGS,
      accessSettings: DEFAULT_ACCESS_SETTINGS,
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
    const role = getBusinessRole(businessId)
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

    if (role === 'member') {
      // "Удалить" чужой бизнес участник не может (и не должен) — вместо этого он
      // покидает команду: удаляется только его собственная строка членства.
      await supabaseFinanceRepository.leaveBusiness(businessId)
      return
    }

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

  closeCurrentPeriod: async (nextPeriod) => {
    await mutateActiveBusiness(get, set, (b) => {
      const closedRecord = { ...b.financialInputs }
      const history = [...b.history.filter((h) => h.period !== closedRecord.period), closedRecord]
      const nextFinancialInputs: FinancialInputs = {
        ...b.financialInputs,
        period: nextPeriod,
        revenue: 0,
        salesCount: 0,
      }
      return { ...b, history, financialInputs: nextFinancialInputs }
    })
  },

  upsertHistoricalRecord: async (record) => {
    await mutateActiveBusiness(get, set, (b) => ({
      ...b,
      history: [...b.history.filter((h) => h.period !== record.period), record].sort((a, c) => a.period.localeCompare(c.period)),
    }))
  },

  /** Массовая загрузка истории (импорт из Excel) — периоды, совпадающие с активным, пропускаются. */
  importHistoricalRecords: async (records) => {
    await mutateActiveBusiness(get, set, (b) => {
      const importable = records.filter((r) => r.period !== b.financialInputs.period)
      const existing = b.history.filter((h) => !importable.some((r) => r.period === h.period))
      return { ...b, history: [...existing, ...importable].sort((a, c) => a.period.localeCompare(c.period)) }
    })
  },

  removeHistoricalRecord: async (period) => {
    await mutateActiveBusiness(get, set, (b) => ({
      ...b,
      history: b.history.filter((h) => h.period !== period),
    }))
  },

  setTarget: async (target) => {
    await mutateActiveBusiness(get, set, (b) => ({
      ...b,
      targets: [...b.targets.filter((t) => t.period !== target.period), target],
    }))
  },

  removeTarget: async (period) => {
    await mutateActiveBusiness(get, set, (b) => ({
      ...b,
      targets: b.targets.filter((t) => t.period !== period),
    }))
  },

  updateBalanceSheet: async (patch) => {
    await mutateActiveBusiness(get, set, (b) => ({ ...b, balanceSheet: { ...b.balanceSheet, ...patch } }))
  },

  addEmployee: async (employee) => {
    const newEmployee = { ...employee, id: generateId('emp') }
    await mutateActiveBusiness(get, set, (b) => ({ ...b, employees: [...b.employees, newEmployee] }))
  },

  updateEmployee: async (id, patch) => {
    await mutateActiveBusiness(get, set, (b) => ({
      ...b,
      employees: b.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }))
  },

  removeEmployee: async (id) => {
    await mutateActiveBusiness(get, set, (b) => ({ ...b, employees: b.employees.filter((e) => e.id !== id) }))
  },

  addPlannedHire: async (hire) => {
    const newHire = { ...hire, id: generateId('hire') }
    await mutateActiveBusiness(get, set, (b) => ({ ...b, plannedHires: [...b.plannedHires, newHire] }))
  },

  removePlannedHire: async (id) => {
    await mutateActiveBusiness(get, set, (b) => ({ ...b, plannedHires: b.plannedHires.filter((h) => h.id !== id) }))
  },

  syncPayrollFromEmployees: async () => {
    await mutateActiveBusiness(get, set, (b) => ({
      ...b,
      financialInputs: { ...b.financialInputs, payroll: b.employees.reduce((sum, e) => sum + e.salary, 0) },
    }))
  },

  addGoal: async (goal) => {
    const newGoal = { ...goal, id: generateId('goal') }
    await mutateActiveBusiness(get, set, (b) => ({ ...b, goals: [...b.goals, newGoal] }))
  },

  removeGoal: async (id) => {
    await mutateActiveBusiness(get, set, (b) => ({ ...b, goals: b.goals.filter((g) => g.id !== id) }))
  },

  updateUnitEconomics: async (patch) => {
    await mutateActiveBusiness(get, set, (b) => ({ ...b, unitEconomics: { ...b.unitEconomics, ...patch } }))
  },

  updateTaxSettings: async (patch) => {
    await mutateActiveBusiness(get, set, (b) => ({ ...b, taxSettings: { ...b.taxSettings, ...patch } }))
  },

  updateAccessSettings: async (patch) => {
    await mutateActiveBusiness(get, set, (b) => ({ ...b, accessSettings: { ...b.accessSettings, ...patch } }))
  },

  resetAll: async () => {
    await getActiveRepository().clear()
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
      history: [],
      targets: [],
      balanceSheet: null,
      employees: [],
      plannedHires: [],
      goals: [],
      unitEconomics: DEFAULT_UNIT_ECONOMICS_ASSUMPTIONS,
      taxSettings: DEFAULT_TAX_SETTINGS,
      accessSettings: DEFAULT_ACCESS_SETTINGS,
      myRole: null,
      myAllowedDomains: [],
    })
  },
}))
