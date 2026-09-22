import { supabase } from '@/lib/supabase/client'
import type { BusinessState, FinanceRepository, MultiBusinessState } from './repository'
import type { BusinessMember, BusinessRole, PendingInvite, TeamDomain } from '@/types/teamAccess'

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
 * Роль текущего пользователя по каждому загруженному бизнесу — заполняется в load()
 * и используется в save(), чтобы решить, писать ли весь blob (владелец) или только
 * изменившиеся верхнеуровневые ключи через RPC (участник, см. 002_team_access.sql).
 * Модульный кэш, а не поле класса — репозиторий используется как синглтон-объект.
 */
const roleByBusinessId = new Map<string, BusinessRole>()
/** Домены, выданные ТЕКУЩЕМУ пользователю по каждому бизнесу, где он участник (не владелец). */
const domainsByBusinessId = new Map<string, TeamDomain[]>()

export function getBusinessRole(businessId: string): BusinessRole | null {
  return roleByBusinessId.get(businessId) ?? null
}

export function getMyAllowedDomains(businessId: string): TeamDomain[] {
  return domainsByBusinessId.get(businessId) ?? []
}

/**
 * Хранилище для авторизованных пользователей. Владелец бизнеса читает/пишет весь
 * blob напрямую (RLS: owner_id = auth.uid(), как раньше). Участник команды —
 * только через SECURITY DEFINER функции в Postgres, которые отдают/принимают лишь
 * верхнеуровневые ключи, открытые ему выданными доменами: RLS не может ограничить
 * доступ к части JSONB-колонки, поэтому прямого SELECT/UPDATE участнику нет вообще.
 */
export class SupabaseFinanceRepository implements FinanceRepository {
  async load(): Promise<MultiBusinessState | null> {
    if (!supabase) return null
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return null

    const { data: rows, error } = await supabase.rpc('list_my_businesses')
    if (error) {
      console.error('SupabaseFinanceRepository.load (list_my_businesses) failed:', error.message)
      return { activeBusinessId: null, businesses: {} }
    }

    const businesses: Record<string, BusinessState> = {}
    roleByBusinessId.clear()
    domainsByBusinessId.clear()
    for (const row of (rows ?? []) as { id: string; role: BusinessRole; allowed_domains: TeamDomain[] | null }[]) {
      const { data: view, error: viewError } = await supabase.rpc('get_business_view', { p_business_id: row.id })
      if (viewError || !view) {
        console.error('SupabaseFinanceRepository.load (get_business_view) failed:', viewError?.message, row.id)
        continue
      }
      businesses[row.id] = view as BusinessState
      roleByBusinessId.set(row.id, row.role)
      if (row.role === 'member') domainsByBusinessId.set(row.id, row.allowed_domains ?? [])
    }

    const storedActiveId = getStoredActiveId()
    const activeBusinessId = storedActiveId && businesses[storedActiveId] ? storedActiveId : (Object.keys(businesses)[0] ?? null)

    return { activeBusinessId, businesses }
  }

  async save(state: MultiBusinessState): Promise<void> {
    if (!supabase) return
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) return

    setStoredActiveId(state.activeBusinessId)

    const ownedRows: { id: string; owner_id: string; data: BusinessState }[] = []
    for (const id of Object.keys(state.businesses)) {
      const role = roleByBusinessId.get(id)
      // Участник никогда не сохраняется здесь целиком — businessStore.persist() для него
      // вызывает saveMemberSection() по изменившимся ключам напрямую, минуя save().
      // По умолчанию (роль неизвестна — например, только что созданный бизнес) считаем
      // владельцем: это единственный случай, когда businessId ещё не был в load().
      if (role === 'member') continue
      ownedRows.push({ id, owner_id: user.id, data: state.businesses[id] })
    }

    if (ownedRows.length > 0) {
      const { error: upsertError } = await supabase.from('businesses').upsert(ownedRows)
      if (upsertError) console.error('SupabaseFinanceRepository.save upsert failed:', upsertError.message)
    }

    // Полная синхронизация: удаляем на сервере СВОИ бизнесы, которых больше нет локально
    // (участники не могут ничего удалить — эта уборка касается только владельца).
    const { data: existingRows, error: listError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
    if (listError) {
      console.error('SupabaseFinanceRepository.save list failed:', listError.message)
      return
    }
    const ownedIds = new Set(ownedRows.map((r) => r.id))
    const staleIds = (existingRows ?? []).map((r) => r.id).filter((id) => !ownedIds.has(id))
    if (staleIds.length > 0) {
      const { error: deleteError } = await supabase.from('businesses').delete().in('id', staleIds)
      if (deleteError) console.error('SupabaseFinanceRepository.save cleanup failed:', deleteError.message)
    }
  }

  /** Сохраняет ОДИН верхнеуровневый ключ бизнеса участником — единственный доступный ему путь записи. */
  async saveMemberSection(businessId: string, key: keyof BusinessState, value: unknown): Promise<boolean> {
    if (!supabase) return false
    const { error } = await supabase.rpc('update_business_section', {
      p_business_id: businessId,
      p_key: key,
      p_value: value,
    })
    if (error) {
      console.error(`SupabaseFinanceRepository.saveMemberSection(${String(key)}) failed:`, error.message)
      return false
    }
    return true
  }

  async clear(): Promise<void> {
    if (!supabase) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    const { error } = await supabase.from('businesses').delete().eq('owner_id', userData.user.id)
    if (error) console.error('SupabaseFinanceRepository.clear failed:', error.message)
    roleByBusinessId.clear()
    domainsByBusinessId.clear()
    setStoredActiveId(null)
  }

  // ── Команда: только владелец (RLS/RPC сами это проверяют, здесь просто вызовы) ──

  async inviteMember(businessId: string, email: string, allowedDomains: TeamDomain[], label: string | null): Promise<'linked' | 'pending' | null> {
    if (!supabase) return null
    const { data, error } = await supabase.rpc('create_invite', {
      p_business_id: businessId,
      p_email: email,
      p_allowed_domains: allowedDomains,
      p_label: label,
    })
    if (error) {
      console.error('SupabaseFinanceRepository.inviteMember failed:', error.message)
      return null
    }
    return data as 'linked' | 'pending'
  }

  async listMembers(businessId: string): Promise<BusinessMember[]> {
    if (!supabase) return []
    const { data, error } = await supabase
      .from('business_members')
      .select('business_id, user_id, allowed_domains, label, created_at')
      .eq('business_id', businessId)
    if (error) {
      console.error('SupabaseFinanceRepository.listMembers failed:', error.message)
      return []
    }
    return (data ?? []).map((r) => ({
      businessId: r.business_id,
      userId: r.user_id,
      allowedDomains: r.allowed_domains as TeamDomain[],
      label: r.label,
      createdAt: r.created_at,
    }))
  }

  async listPendingInvites(businessId: string): Promise<PendingInvite[]> {
    if (!supabase) return []
    const { data, error } = await supabase
      .from('pending_invites')
      .select('id, business_id, email, allowed_domains, label, created_at')
      .eq('business_id', businessId)
    if (error) {
      console.error('SupabaseFinanceRepository.listPendingInvites failed:', error.message)
      return []
    }
    return (data ?? []).map((r) => ({
      id: r.id,
      businessId: r.business_id,
      email: r.email,
      allowedDomains: r.allowed_domains as TeamDomain[],
      label: r.label,
      createdAt: r.created_at,
    }))
  }

  async updateMemberAccess(businessId: string, userId: string, allowedDomains: TeamDomain[]): Promise<boolean> {
    if (!supabase) return false
    const { error } = await supabase
      .from('business_members')
      .update({ allowed_domains: allowedDomains })
      .match({ business_id: businessId, user_id: userId })
    if (error) {
      console.error('SupabaseFinanceRepository.updateMemberAccess failed:', error.message)
      return false
    }
    return true
  }

  async removeMember(businessId: string, userId: string): Promise<boolean> {
    if (!supabase) return false
    const { error } = await supabase.from('business_members').delete().match({ business_id: businessId, user_id: userId })
    if (error) {
      console.error('SupabaseFinanceRepository.removeMember failed:', error.message)
      return false
    }
    return true
  }

  /** Участник покидает команду сам — удаляет только свою строку членства (RLS это разрешает). */
  async leaveBusiness(businessId: string): Promise<boolean> {
    if (!supabase) return false
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) return false
    const { error } = await supabase.from('business_members').delete().match({ business_id: businessId, user_id: user.id })
    if (error) {
      console.error('SupabaseFinanceRepository.leaveBusiness failed:', error.message)
      return false
    }
    roleByBusinessId.delete(businessId)
    domainsByBusinessId.delete(businessId)
    return true
  }

  async revokeInvite(inviteId: string): Promise<boolean> {
    if (!supabase) return false
    const { error } = await supabase.from('pending_invites').delete().eq('id', inviteId)
    if (error) {
      console.error('SupabaseFinanceRepository.revokeInvite failed:', error.message)
      return false
    }
    return true
  }
}

export const supabaseFinanceRepository = new SupabaseFinanceRepository()
