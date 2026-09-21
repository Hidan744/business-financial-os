import type { BusinessProfile } from '@/types/business'
import type { BalanceSheetInputs, CashFlowInputs, FinancialInputs, PeriodTarget } from '@/types/finance'
import type { ForecastConfig, Scenario } from '@/types/scenario'
import type { AiCfoMessage } from '@/types/ai'
import type { Employee, PlannedHire } from '@/types/hr'
import type { Goal } from '@/types/goal'
import type { UnitEconomicsAssumptions } from '@/types/unitEconomics'
import type { TaxSettings } from '@/types/tax'

export interface BusinessState {
  profile: BusinessProfile
  financialInputs: FinancialInputs
  cashFlowInputs: CashFlowInputs
  scenarios: Scenario[]
  forecastConfig: ForecastConfig
  aiHistory: AiCfoMessage[]
  onboardingComplete: boolean
  /** Закрытые (прошлые) периоды — реальные факты, не прогноз. Не включает текущий period. */
  history: FinancialInputs[]
  /** Целевые показатели по периодам для сравнения план/факт. */
  targets: PeriodTarget[]
  /** Баланс на конец текущего периода. */
  balanceSheet: BalanceSheetInputs
  /** Штат сотрудников (для ФОТ снизу вверх). */
  employees: Employee[]
  /** Запланированные, ещё не нанятые сотрудники. */
  plannedHires: PlannedHire[]
  /** Финансовые цели с трекингом прогресса. */
  goals: Goal[]
  /** Предположения для расчёта LTV/CAC (Unit Economics). */
  unitEconomics: UnitEconomicsAssumptions
  /** Настройки налогового режима для калькулятора налогов. */
  taxSettings: TaxSettings
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
