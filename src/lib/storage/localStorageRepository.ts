import type { BusinessState, FinanceRepository, MultiBusinessState } from './repository'

const STORAGE_KEY = 'bfos:state:v2'
const LEGACY_SINGLE_BUSINESS_KEY = 'bfos:state:v1'

function migrateLegacyState(): MultiBusinessState | null {
  try {
    const raw = localStorage.getItem(LEGACY_SINGLE_BUSINESS_KEY)
    if (!raw) return null
    const legacy = JSON.parse(raw) as BusinessState
    const migrated: MultiBusinessState = {
      activeBusinessId: legacy.profile.id,
      businesses: { [legacy.profile.id]: legacy },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
    localStorage.removeItem(LEGACY_SINGLE_BUSINESS_KEY)
    return migrated
  } catch {
    return null
  }
}

export class LocalStorageFinanceRepository implements FinanceRepository {
  async load(): Promise<MultiBusinessState | null> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw) as MultiBusinessState
      return migrateLegacyState()
    } catch {
      return null
    }
  }

  async save(state: MultiBusinessState): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // localStorage может быть недоступен (приватный режим, квота) — не роняем приложение
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(LEGACY_SINGLE_BUSINESS_KEY)
    } catch {
      // ignore
    }
  }
}

export const financeRepository: FinanceRepository = new LocalStorageFinanceRepository()
