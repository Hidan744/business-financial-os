import type { BusinessProfile } from '@/types/business'
import type { CashFlowInputs, FinancialInputs } from '@/types/finance'
import type { ForecastConfig, Scenario } from '@/types/scenario'
import type { AiCfoMessage } from '@/types/ai'

export interface BusinessState {
  profile: BusinessProfile
  financialInputs: FinancialInputs
  cashFlowInputs: CashFlowInputs
  scenarios: Scenario[]
  forecastConfig: ForecastConfig
  aiHistory: AiCfoMessage[]
  onboardingComplete: boolean
}

/** Несколько бизнесов пользователя + указатель на активный. */
export interface MultiBusinessState {
  activeBusinessId: string | null
  businesses: Record<string, BusinessState>
}

/**
 * Контракт хранилища данных бизнеса. Сейчас реализован через localStorage
 * (см. localStorageRepository.ts). Чтобы подключить backend (например Supabase),
 * достаточно написать новую реализацию этого интерфейса — вызывающий код
 * (Zustand store) не изменится.
 */
export interface FinanceRepository {
  load(): Promise<MultiBusinessState | null>
  save(state: MultiBusinessState): Promise<void>
  clear(): Promise<void>
}
