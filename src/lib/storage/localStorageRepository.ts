import type { BusinessState, FinanceRepository } from './repository'

const STORAGE_KEY = 'bfos:state:v1'

export class LocalStorageFinanceRepository implements FinanceRepository {
  async load(): Promise<BusinessState | null> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as BusinessState
    } catch {
      return null
    }
  }

  async save(state: BusinessState): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // localStorage может быть недоступен (приватный режим, квота) — не роняем приложение
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }
}

export const financeRepository: FinanceRepository = new LocalStorageFinanceRepository()
