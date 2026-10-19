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
/**
 * true, если последний load() не смог прочитать ХОТЯ БЫ ОДИН бизнес (сетевая ошибка/таймаут
 * RPC) — в этом случае save() не должен считать businesses{} полным снимком истины и удалять
 * "лишние" бизнесы на сервере: отсутствие бизнеса в памяти может означать не "пользователь
 * удалил его", а "не удалось загрузить в этот раз". См. reviews/2026-10-19-review.md, пункт 1.
 */
let lastLoadHadErrors = false
/**
 * updated_at последней ЗАГРУЖЕННОЙ с сервера версии владельческого бизнеса — используется в
 * save() как оптимистичная блокировка (пункт 3 ревью): если к моменту сохранения серверный
 * updated_at уже другой, значит бизнес кто-то изменил параллельно (другая вкладка/устройство),
 * и перезаписывать его целиком нельзя — иначе чужая правка молча исчезнет.
 */
const lastKnownUpdatedAtByBusinessId = new Map<string, string>()

export function getBusinessRole(businessId: string): BusinessRole | null {
  return roleByBusinessId.get(businessId) ?? null
}

export function getMyAllowedDomains(businessId: string): TeamDomain[] {
  return domainsByBusinessId.get(businessId) ?? []
}

/** Бросается из save(), когда сервер сообщает, что бизнес изменился в другом месте с момента load(). */
export class ConcurrentSaveConflictError extends Error {
  readonly businessNames: string[]

  constructor(businessNames: string[]) {
    super(
      businessNames.length === 1
        ? `Данные бизнеса «${businessNames[0]}» изменились в другом месте (другая вкладка или устройство). Обновите страницу, чтобы не потерять эти изменения.`
        : `Данные нескольких бизнесов изменились в другом месте (другая вкладка или устройство): ${businessNames.join(', ')}. Обновите страницу, чтобы не потерять эти изменения.`,
    )
    this.name = 'ConcurrentSaveConflictError'
    this.businessNames = businessNames
  }
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

    lastLoadHadErrors = false
    roleByBusinessId.clear()
    domainsByBusinessId.clear()
    lastKnownUpdatedAtByBusinessId.clear()

    const { data: rows, error } = await supabase.rpc('list_my_businesses')
    if (error) {
      console.error('SupabaseFinanceRepository.load (list_my_businesses) failed:', error.message)
      lastLoadHadErrors = true
      return { activeBusinessId: null, businesses: {} }
    }

    const businesses: Record<string, BusinessState> = {}
    const ownerIds: string[] = []
    for (const row of (rows ?? []) as { id: string; role: BusinessRole; allowed_domains: TeamDomain[] | null }[]) {
      const { data: view, error: viewError } = await supabase.rpc('get_business_view', { p_business_id: row.id })
      if (viewError || !view) {
        console.error('SupabaseFinanceRepository.load (get_business_view) failed:', viewError?.message, row.id)
        lastLoadHadErrors = true
        continue
      }
      businesses[row.id] = view as BusinessState
      roleByBusinessId.set(row.id, row.role)
      if (row.role === 'member') domainsByBusinessId.set(row.id, row.allowed_domains ?? [])
      else ownerIds.push(row.id)
    }

    // updated_at нужен только для владельческих бизнесов — только для них save() делает
    // полную перезапись blob'а и только там имеет смысл проверка версии (пункт 3 ревью).
    if (ownerIds.length > 0) {
      const { data: meta, error: metaError } = await supabase.from('businesses').select('id, updated_at').in('id', ownerIds)
      if (metaError) {
        console.error('SupabaseFinanceRepository.load (updated_at) failed:', metaError.message)
        lastLoadHadErrors = true
      } else {
        for (const row of meta ?? []) lastKnownUpdatedAtByBusinessId.set(row.id, row.updated_at)
      }
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

    // Проверка версии (пункт 3 ревью): для каждого бизнеса, у которого уже есть известный
    // updated_at с момента load(), сверяем его с текущим серверным — если не совпадает,
    // значит бизнес изменили в другом месте, и перезаписывать его целиком нельзя молча.
    const rowsToUpsert: typeof ownedRows = []
    const conflictedNames: string[] = []
    const knownIds = ownedRows.filter((r) => lastKnownUpdatedAtByBusinessId.has(r.id)).map((r) => r.id)
    const currentUpdatedAt = new Map<string, string>()
    if (knownIds.length > 0) {
      const { data: meta, error: metaError } = await supabase.from('businesses').select('id, updated_at').in('id', knownIds)
      if (metaError) {
        console.error('SupabaseFinanceRepository.save (version check) failed:', metaError.message)
      } else {
        for (const row of meta ?? []) currentUpdatedAt.set(row.id, row.updated_at)
      }
    }
    for (const row of ownedRows) {
      const known = lastKnownUpdatedAtByBusinessId.get(row.id)
      const current = currentUpdatedAt.get(row.id)
      if (known && current && known !== current) {
        conflictedNames.push(row.data.profile?.name ?? row.id)
        continue
      }
      rowsToUpsert.push(row)
    }

    if (rowsToUpsert.length > 0) {
      const { data: upserted, error: upsertError } = await supabase.from('businesses').upsert(rowsToUpsert).select('id, updated_at')
      if (upsertError) console.error('SupabaseFinanceRepository.save upsert failed:', upsertError.message)
      else for (const row of upserted ?? []) lastKnownUpdatedAtByBusinessId.set(row.id, row.updated_at)
    }

    // Полная синхронизация: удаляем на сервере СВОИ бизнесы, которых больше нет локально
    // (участники не могут ничего удалить — эта уборка касается только владельца).
    // Пропускаем этот деструктивный шаг целиком, если последний load() не смог прочитать
    // хотя бы один бизнес — иначе бизнес, не загрузившийся из-за сетевой ошибки, будет
    // удалён отсюда как будто пользователь сам его убрал (пункт 1 ревью).
    if (!lastLoadHadErrors) {
      const { data: existingRows, error: listError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
      if (listError) {
        console.error('SupabaseFinanceRepository.save list failed:', listError.message)
      } else {
        const ownedIds = new Set(ownedRows.map((r) => r.id))
        const staleIds = (existingRows ?? []).map((r) => r.id).filter((id) => !ownedIds.has(id))
        if (staleIds.length > 0) {
          const { error: deleteError } = await supabase.from('businesses').delete().in('id', staleIds)
          if (deleteError) console.error('SupabaseFinanceRepository.save cleanup failed:', deleteError.message)
        }
      }
    }

    if (conflictedNames.length > 0) throw new ConcurrentSaveConflictError(conflictedNames)
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
    // .select() на update() заставляет PostgREST вернуть реально затронутые строки — без него
    // RLS, молча отфильтровавшая запрос не-владельца до 0 строк, выглядела бы как success (пункт 5
    // ревью): error здесь пуст и в случае блокировки RLS, и в случае реального обновления.
    const { data, error } = await supabase
      .from('business_members')
      .update({ allowed_domains: allowedDomains })
      .match({ business_id: businessId, user_id: userId })
      .select('user_id')
    if (error) {
      console.error('SupabaseFinanceRepository.updateMemberAccess failed:', error.message)
      return false
    }
    if (!data || data.length === 0) {
      console.error('SupabaseFinanceRepository.updateMemberAccess: 0 строк изменено (нет прав или участник не найден)', businessId, userId)
      return false
    }
    return true
  }

  async removeMember(businessId: string, userId: string): Promise<boolean> {
    if (!supabase) return false
    const { data, error } = await supabase
      .from('business_members')
      .delete()
      .match({ business_id: businessId, user_id: userId })
      .select('user_id')
    if (error) {
      console.error('SupabaseFinanceRepository.removeMember failed:', error.message)
      return false
    }
    if (!data || data.length === 0) {
      console.error('SupabaseFinanceRepository.removeMember: 0 строк удалено (нет прав или участник не найден)', businessId, userId)
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
