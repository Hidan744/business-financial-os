import type { BusinessState, FinanceRepository, MultiBusinessState } from './repository'

const STORAGE_KEY = 'bfos:state:v2'
const LEGACY_SINGLE_BUSINESS_KEY = 'bfos:state:v1'

/**
 * Если raw существует, но не парсится — это НЕ "данных никогда не было", а повреждённая
 * запись (частичная запись при падении вкладки, стороннее вмешательство). Переносим её под
 * резервный ключ перед тем, как сигнализировать "нет данных" — иначе следующий же save()
 * перезапишет STORAGE_KEY новыми данными, и исходную (возможно восстановимую вручную) строку
 * будет уже не вернуть. См. reviews/2026-10-19-review.md, пункт 4.
 */
function backupCorrupted(key: string, raw: string): void {
  try {
    localStorage.setItem(`${key}:corrupted:${Date.now()}`, raw)
  } catch {
    // ignore — сама попытка сохранить бэкап не должна ронять приложение
  }
}

function migrateLegacyState(): MultiBusinessState | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(LEGACY_SINGLE_BUSINESS_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const legacy = JSON.parse(raw) as BusinessState
    const migrated: MultiBusinessState = {
      activeBusinessId: legacy.profile.id,
      businesses: { [legacy.profile.id]: legacy },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
    localStorage.removeItem(LEGACY_SINGLE_BUSINESS_KEY)
    return migrated
  } catch (e) {
    console.error('LocalStorageFinanceRepository: не удалось разобрать устаревшую запись (v1) — она повреждена, не данные отсутствуют.', e)
    backupCorrupted(LEGACY_SINGLE_BUSINESS_KEY, raw)
    return null
  }
}

export class LocalStorageFinanceRepository implements FinanceRepository {
  async load(): Promise<MultiBusinessState | null> {
    let raw: string | null
    try {
      raw = localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
    if (!raw) return migrateLegacyState()
    try {
      return JSON.parse(raw) as MultiBusinessState
    } catch (e) {
      console.error('LocalStorageFinanceRepository: не удалось разобрать сохранённые данные — запись повреждена, не отсутствует.', e)
      backupCorrupted(STORAGE_KEY, raw)
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
