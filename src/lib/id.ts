export function generateId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

/** UUID — обязателен для business.id: строка используется как первичный ключ типа uuid в Supabase. */
export function generateBusinessId(): string {
  return crypto.randomUUID()
}
