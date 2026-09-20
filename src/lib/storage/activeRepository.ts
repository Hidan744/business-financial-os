import type { FinanceRepository } from './repository'
import { financeRepository as localFinanceRepository } from './localStorageRepository'

/**
 * Единая точка доступа к текущему хранилищу: гость работает через localStorage,
 * авторизованный пользователь — через Supabase. authStore переключает это при
 * входе/выходе и просит businessStore перечитать данные.
 */
let active: FinanceRepository = localFinanceRepository

export function getActiveRepository(): FinanceRepository {
  return active
}

export function setActiveRepository(repo: FinanceRepository): void {
  active = repo
}

export { localFinanceRepository }
