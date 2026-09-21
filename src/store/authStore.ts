import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { setActiveRepository, localFinanceRepository } from '@/lib/storage/activeRepository'
import { supabaseFinanceRepository } from '@/lib/storage/supabaseFinanceRepository'
import { useBusinessStore } from './businessStore'
import { useAccessGateStore } from './accessGateStore'

interface AuthStore {
  status: 'loading' | 'guest' | 'authenticated'
  user: User | null
  error: string | null
  cloudEnabled: boolean

  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  /** Отправляет письмо со ссылкой для сброса пароля. */
  requestPasswordReset: (email: string) => Promise<boolean>
  /** Меняет пароль — работает только когда есть активная recovery-сессия (после перехода по ссылке из письма). */
  updatePassword: (newPassword: string) => Promise<boolean>
}

/** Если локально уже есть бизнесы, а в облаке пусто — переносим их один раз при первом входе. */
async function migrateGuestDataIfRemoteEmpty() {
  const remote = await supabaseFinanceRepository.load()
  if (!remote || Object.keys(remote.businesses).length > 0) return

  const local = await localFinanceRepository.load()
  if (!local || Object.keys(local.businesses).length === 0) return

  await supabaseFinanceRepository.save(local)
}

export const useAuthStore = create<AuthStore>((set) => ({
  status: 'loading',
  user: null,
  error: null,
  cloudEnabled: isSupabaseConfigured,

  init: async () => {
    if (!supabase) {
      setActiveRepository(localFinanceRepository)
      set({ status: 'guest', user: null })
      await useBusinessStore.getState().hydrate()
      return
    }

    const { data } = await supabase.auth.getSession()
    const user = data.session?.user ?? null

    if (user) {
      setActiveRepository(supabaseFinanceRepository)
      await migrateGuestDataIfRemoteEmpty()
      set({ status: 'authenticated', user })
    } else {
      setActiveRepository(localFinanceRepository)
      set({ status: 'guest', user: null })
    }
    await useBusinessStore.getState().hydrate()

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setActiveRepository(supabaseFinanceRepository)
        await migrateGuestDataIfRemoteEmpty()
        set({ status: 'authenticated', user: session.user, error: null })
        await useBusinessStore.getState().hydrate()
      } else if (event === 'SIGNED_OUT') {
        setActiveRepository(localFinanceRepository)
        set({ status: 'guest', user: null })
        // Полный сброс, а не просто переключение на локальные данные: иначе после
        // выхода могли всплыть демо/старые данные, ранее сохранённые в этом браузере.
        await useBusinessStore.getState().resetAll()
        useAccessGateStore.getState().lock()
      }
    })
  },

  signIn: async (email, password) => {
    if (!supabase) return false
    set({ error: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ error: error.message })
      return false
    }
    return true
  },

  signUp: async (email, password) => {
    if (!supabase) return false
    set({ error: null })
    // Явно указываем адрес приложения для ссылки в письме — иначе Supabase подставляет
    // Site URL из настроек проекта, который по умолчанию указывает на http://localhost:3000.
    const emailRedirectTo = window.location.origin + import.meta.env.BASE_URL
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo } })
    if (error) {
      set({ error: error.message })
      return false
    }
    // Supabase не возвращает отдельную ошибку на повторную регистрацию уже существующего
    // email (защита от email enumeration — иначе по ответу можно было бы угадывать, кто
    // зарегистрирован). Вместо этого он молча "успешно" отвечает, но не создаёт вторую
    // identity: пустой identities — верный признак, что аккаунт с этим email уже есть.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      set({ error: 'Этот email уже зарегистрирован. Попробуйте войти или восстановить пароль.' })
      return false
    }
    return true
  },

  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  },

  requestPasswordReset: async (email) => {
    if (!supabase) return false
    set({ error: null })
    // Без пути раздела в адресе — Supabase дописывает свои параметры (#access_token=...)
    // прямо в хэш, а HashRouter тоже использует хэш для своих роутов; один хэш на двоих
    // ломает и то, и другое. App.tsx сам распознаёт recovery-параметры и ведёт на /reset-password.
    const redirectTo = window.location.origin + import.meta.env.BASE_URL
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) {
      set({ error: error.message })
      return false
    }
    return true
  },

  updatePassword: async (newPassword) => {
    if (!supabase) return false
    set({ error: null })
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      set({ error: error.message })
      return false
    }
    return true
  },
}))
