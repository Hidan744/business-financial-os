import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BusinessState, MultiBusinessState } from './repository'

// Мок supabase-клиента: имитирует таблицу businesses в памяти с той же
// формой ответа {data, error}, что и настоящий supabase-js query builder.
const table: { id: string; owner_id: string; data: BusinessState }[] = []
const memberships: { business_id: string; user_id: string; allowed_domains: string[] }[] = []
const currentUser = { id: 'user-1' }

function makeQuery(rows: typeof table) {
  let result = [...rows]
  const query = {
    select: (..._args: unknown[]) => query,
    eq: (col: string, value: unknown) => {
      result = result.filter((r) => (r as Record<string, unknown>)[col] === value)
      return query
    },
    in: (col: string, values: unknown[]) => {
      result = result.filter((r) => values.includes((r as Record<string, unknown>)[col]))
      return query
    },
    order: (..._args: unknown[]) => query,
  }
  ;(query as unknown as { then: (resolve: (v: unknown) => void) => void }).then = (resolve) =>
    resolve({ data: result, error: null })
  return query
}

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: currentUser } }),
    },
    // load() теперь идёт через RPC (list_my_businesses + get_business_view), а не через
    // прямой select — в этих тестах нет участников команды, поэтому имитируем только
    // владельческую ветку (все строки в table принадлежат currentUser).
    rpc: async (name: string, args?: Record<string, unknown>) => {
      if (name === 'list_my_businesses') {
        const owned = table
          .filter((r) => r.owner_id === currentUser.id)
          .map((r) => ({ id: r.id, role: 'owner', allowed_domains: null }))
        const member = memberships
          .filter((m) => m.user_id === currentUser.id)
          .map((m) => ({ id: m.business_id, role: 'member', allowed_domains: m.allowed_domains }))
        return { data: [...owned, ...member], error: null }
      }
      if (name === 'get_business_view') {
        const row = table.find((r) => r.id === args?.p_business_id)
        return { data: row?.data ?? null, error: row ? null : { message: 'not found' } }
      }
      if (name === 'update_business_section') {
        const businessId = args?.p_business_id as string
        const key = args?.p_key as string
        const membership = memberships.find((m) => m.business_id === businessId && m.user_id === currentUser.id)
        if (!membership) return { data: null, error: { message: 'not a member of this business' } }
        const required: Record<string, string> = { financialInputs: 'finance', goals: 'goals' }
        if (!membership.allowed_domains.includes(required[key])) {
          return { data: null, error: { message: `no write access to ${key}` } }
        }
        const row = table.find((r) => r.id === businessId)
        if (row) (row.data as unknown as Record<string, unknown>)[key] = args?.p_value
        return { data: null, error: null }
      }
      return { data: null, error: { message: `unmocked rpc ${name}` } }
    },
    from: (_name: string) => ({
      select: (..._args: unknown[]) => makeQuery(table),
      upsert: async (rows: { id: string; owner_id: string; data: BusinessState }[]) => {
        for (const row of rows) {
          const idx = table.findIndex((r) => r.id === row.id)
          if (idx >= 0) table[idx] = row
          else table.push(row)
        }
        return { error: null }
      },
      delete: () => ({
        in: async (_col: string, ids: string[]) => {
          for (const id of ids) {
            const idx = table.findIndex((r) => r.id === id)
            if (idx >= 0) table.splice(idx, 1)
          }
          return { error: null }
        },
        eq: async (col: string, value: unknown) => {
          for (let i = table.length - 1; i >= 0; i--) {
            if ((table[i] as Record<string, unknown>)[col] === value) table.splice(i, 1)
          }
          return { error: null }
        },
      }),
    }),
  },
}))

const { SupabaseFinanceRepository, getBusinessRole, getMyAllowedDomains } = await import('./supabaseFinanceRepository')

function makeBusiness(id: string, name: string): BusinessState {
  return {
    profile: { id, name, type: 'other', currency: 'RUB', period: 'month', employeesCount: 1, createdAt: new Date().toISOString() },
    financialInputs: {
      businessId: id, period: '2026-09', revenue: 1000, cogs: 300, payroll: 100, rent: 50, marketing: 20,
      logistics: 0, utilities: 0, software: 0, customExpenseLines: [], depreciation: 0, loanInterest: 0,
      taxes: 50, loanPayments: 0, avgCheck: 100, salesCount: 10,
    },
    cashFlowInputs: {
      businessId: id, period: '2026-09', openingBalance: 0,
      operating: { customerPayments: 0, supplierPayments: 0, payroll: 0, rent: 0, marketing: 0, taxes: 0, otherOperating: 0 },
      investing: { equipment: 0, repairs: 0, assetPurchases: 0 },
      financing: { loanReceived: 0, loanRepaid: 0, ownerInvestment: 0, ownerWithdrawal: 0 },
    },
    scenarios: [],
    forecastConfig: { salesCountGrowthPct: 0, seasonality: Array(12).fill(1), marketingBudgetTrendPct: 0, avgCheckGrowthPct: 0, employeesGrowth: 0 },
    aiHistory: [],
    onboardingComplete: true,
    history: [],
    targets: [],
    balanceSheet: {
      businessId: id,
      period: '2026-09',
      currentAssets: { cash: 0, receivables: 0, inventory: 0, other: 0 },
      nonCurrentAssets: { fixedAssets: 0, other: 0 },
      currentLiabilities: { payables: 0, shortTermDebt: 0, other: 0 },
      nonCurrentLiabilities: { longTermDebt: 0, other: 0 },
    },
    balanceSheetHistory: [],
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
    products: [],
    stockMovements: [],
  }
}

describe('SupabaseFinanceRepository', () => {
  beforeEach(() => {
    table.length = 0
    memberships.length = 0
    localStorage.clear()
  })

  it('upserts new businesses on save and reads them back on load', async () => {
    const repo = new SupabaseFinanceRepository()
    const state: MultiBusinessState = {
      activeBusinessId: 'b1',
      businesses: { b1: makeBusiness('b1', 'Cafe One') },
    }
    await repo.save(state)
    expect(table).toHaveLength(1)
    expect(table[0].owner_id).toBe('user-1')

    const loaded = await repo.load()
    expect(loaded?.businesses.b1.profile.name).toBe('Cafe One')
    expect(loaded?.activeBusinessId).toBe('b1')
  })

  it('deletes rows on the server that are no longer present locally (full sync)', async () => {
    const repo = new SupabaseFinanceRepository()
    await repo.save({
      activeBusinessId: 'b1',
      businesses: { b1: makeBusiness('b1', 'Cafe One'), b2: makeBusiness('b2', 'Cafe Two') },
    })
    expect(table).toHaveLength(2)

    // b2 removed locally — next save should delete it server-side too
    await repo.save({ activeBusinessId: 'b1', businesses: { b1: makeBusiness('b1', 'Cafe One') } })
    expect(table).toHaveLength(1)
    expect(table[0].id).toBe('b1')
  })

  it('clear() removes every business owned by the current user', async () => {
    const repo = new SupabaseFinanceRepository()
    await repo.save({
      activeBusinessId: 'b1',
      businesses: { b1: makeBusiness('b1', 'Cafe One'), b2: makeBusiness('b2', 'Cafe Two') },
    })
    await repo.clear()
    expect(table).toHaveLength(0)
  })

  it('falls back to the first business when the stored active id no longer exists', async () => {
    const repo = new SupabaseFinanceRepository()
    await repo.save({ activeBusinessId: 'ghost', businesses: { b1: makeBusiness('b1', 'Cafe One') } })
    const loaded = await repo.load()
    expect(loaded?.activeBusinessId).toBe('b1')
  })

  it('load() includes businesses the user is a team member of, not just owned ones', async () => {
    // b1 owned by someone else, current user is a member with the 'finance' domain
    table.push({ id: 'b1', owner_id: 'owner-2', data: makeBusiness('b1', "Someone Else's Cafe") })
    memberships.push({ business_id: 'b1', user_id: currentUser.id, allowed_domains: ['finance'] })

    const repo = new SupabaseFinanceRepository()
    const loaded = await repo.load()
    expect(loaded?.businesses.b1.profile.name).toBe("Someone Else's Cafe")
    expect(getBusinessRole('b1')).toBe('member')
    expect(getMyAllowedDomains('b1')).toEqual(['finance'])
  })

  it('save() never upserts or deletes a business the user is only a member of', async () => {
    table.push({ id: 'b1', owner_id: 'owner-2', data: makeBusiness('b1', 'Member Business') })
    memberships.push({ business_id: 'b1', user_id: currentUser.id, allowed_domains: ['finance'] })
    const repo = new SupabaseFinanceRepository()
    await repo.load() // populates the role cache so save() knows b1 is a member business

    const original = table[0].data
    await repo.save({ activeBusinessId: 'b1', businesses: { b1: makeBusiness('b1', 'Tampered Name') } })

    expect(table).toHaveLength(1) // not deleted as "stale"
    expect(table[0].data).toBe(original) // not overwritten either — save() skips member businesses entirely
  })

  it('saveMemberSection() writes a field only when the required domain is granted', async () => {
    const business = makeBusiness('b1', 'Member Business')
    table.push({ id: 'b1', owner_id: 'owner-2', data: business })
    memberships.push({ business_id: 'b1', user_id: currentUser.id, allowed_domains: ['finance'] })

    const repo = new SupabaseFinanceRepository()
    const ok = await repo.saveMemberSection('b1', 'financialInputs', { ...business.financialInputs, revenue: 999999 })
    expect(ok).toBe(true)
    expect(table[0].data.financialInputs.revenue).toBe(999999)

    // 'goals' requires the 'goals' domain, which this member was not granted
    const denied = await repo.saveMemberSection('b1', 'goals', [{ id: 'g1' }])
    expect(denied).toBe(false)
  })
})
