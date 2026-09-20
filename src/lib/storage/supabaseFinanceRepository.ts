import { supabase } from '@/lib/supabase/client'
import type { BusinessState, FinanceRepository, MultiBusinessState } from './repository'

interface BusinessRow {
  id: string
  data: BusinessState
}

const ACTIVE_BUSINESS_KEY = 'bfos:activeBusinessId'

function getStoredActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_BUSINESS_KEY)
  } catch {
    return null
  }
}

function setStoredActiveId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_BUSINESS_KEY, id)
    else localStorage.removeItem(ACTIVE_BUSINESS_KEY)
  } catch {
    // ignore
  }
}

/**
 * Хранилище для авторизованных пользователей: каждый бизнес — одна строка в
 * таблице public.businesses (JSONB), защищённая RLS-политикой owner_id = auth.uid().
 * "Активный бизнес" — локальная UI-настройка устройства, не синхронизируется.
 */
export class SupabaseFinanceRepository implements FinanceRepository {
  async load(): Promise<MultiBusinessState | null> {
    if (!supabase) return null
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return null

    const { data, error } = await supabase
      .from('businesses')
      .select('id, data')
      .eq('owner_id', userData.user.id)
      .order('updated_at', { ascending: true })

    if (error) {
      console.error('SupabaseFinanceRepository.load failed:', error.message)
      return { activeBusinessId: null, businesses: {} }
    }

    const rows = (data ?? []) as BusinessRow[]
    const businesses: Record<string, BusinessState> = {}
    for (const row of rows) {
      businesses[row.id] = row.data
    }

    const storedActiveId = getStoredActiveId()
    const activeBusinessId = storedActiveId && businesses[storedActiveId] ? storedActiveId : (rows[0]?.id ?? null)

    return { activeBusinessId, businesses }
  }

  async save(state: MultiBusinessState): Promise<void> {
    if (!supabase) return
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) return

    setStoredActiveId(state.activeBusinessId)

    const businessIds = Object.keys(state.businesses)

    if (businessIds.length > 0) {
      const rows = businessIds.map((id) => ({ id, owner_id: user.id, data: state.businesses[id] }))
      const { error: upsertError } = await supabase.from('businesses').upsert(rows)
      if (upsertError) console.error('SupabaseFinanceRepository.save upsert failed:', upsertError.message)
    }

    // Полная синхронизация: удаляем на сервере бизнесы, которых больше нет локально.
    const { data: existingRows, error: listError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
    if (listError) {
      console.error('SupabaseFinanceRepository.save list failed:', listError.message)
      return
    }
    const staleIds = (existingRows ?? []).map((r) => r.id).filter((id) => !businessIds.includes(id))
    if (staleIds.length > 0) {
      const { error: deleteError } = await supabase.from('businesses').delete().in('id', staleIds)
      if (deleteError) console.error('SupabaseFinanceRepository.save cleanup failed:', deleteError.message)
    }
  }

  async clear(): Promise<void> {
    if (!supabase) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    const { error } = await supabase.from('businesses').delete().eq('owner_id', userData.user.id)
    if (error) console.error('SupabaseFinanceRepository.clear failed:', error.message)
    setStoredActiveId(null)
  }
}

export const supabaseFinanceRepository = new SupabaseFinanceRepository()
