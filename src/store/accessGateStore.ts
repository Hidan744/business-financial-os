import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Разблокировка защищённых PIN-кодом разделов — только на время вкладки браузера
 * (sessionStorage), не сохраняется вместе с данными бизнеса.
 */
interface AccessGateStore {
  /** null — заблокировано; 'owner' — открыто PIN-ом владельца; иначе id сотрудника. */
  unlockedBy: 'owner' | string | null
  unlockedRoutes: string[]
  unlock: (by: 'owner' | string, routes: string[]) => void
  lock: () => void
}

export const useAccessGateStore = create<AccessGateStore>()(
  persist(
    (set) => ({
      unlockedBy: null,
      unlockedRoutes: [],
      unlock: (by, routes) => set({ unlockedBy: by, unlockedRoutes: routes }),
      lock: () => set({ unlockedBy: null, unlockedRoutes: [] }),
    }),
    { name: 'bfos-access-gate', storage: createJSONStorage(() => sessionStorage) },
  ),
)
