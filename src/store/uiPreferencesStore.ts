import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Локальные предпочтения интерфейса, не относящиеся к данным бизнеса (не синхронизируются
 * с Supabase и не входят в командные домены доступа) — когда в последний раз показывали
 * ежедневную сводку, по businessId, чтобы окно всплывало не чаще раза в календарный день.
 */
interface UiPreferencesStore {
  digestLastSeenByBusiness: Record<string, string>
  markDigestSeen: (businessId: string, date: string) => void
}

export const useUiPreferencesStore = create<UiPreferencesStore>()(
  persist(
    (set) => ({
      digestLastSeenByBusiness: {},
      markDigestSeen: (businessId, date) =>
        set((s) => ({ digestLastSeenByBusiness: { ...s.digestLastSeenByBusiness, [businessId]: date } })),
    }),
    { name: 'bfos-ui-preferences' },
  ),
)
