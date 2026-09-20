import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * undefined, если переменные окружения не заданы — приложение в этом случае
 * работает полностью локально (гостевой режим), как и до подключения backend.
 */
export const supabase = url && anonKey ? createClient(url, anonKey) : null
