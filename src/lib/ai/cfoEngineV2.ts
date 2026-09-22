import { supabase } from '@/lib/supabase/client'
import type { FinancialContext } from './buildFinancialContext'

export interface AskAiCfoResult {
  answer?: string
  error?: string
}

/**
 * Вызывает Edge Function ai-cfo (прокси к YandexGPT) — единственное место в клиенте,
 * которое обращается к LLM. Сама LLM не считает деньги, только объясняет уже готовый
 * context (см. buildFinancialContext.ts). Любая ошибка (нет Supabase, функция не
 * задеплоена, нет ключа на сервере, сетевая ошибка) возвращается как { error }, а не
 * бросается — вызывающий код (AiCfoPage) откатывается на rule-based ответ.
 */
export async function askAiCfo(
  question: string,
  context: FinancialContext,
  history: { role: 'user' | 'assistant'; text: string }[],
): Promise<AskAiCfoResult> {
  if (!supabase) return { error: 'Supabase не настроен' }

  try {
    const { data, error } = await supabase.functions.invoke<{ answer?: string; error?: string }>('ai-cfo', {
      body: { question, context, history },
    })
    if (error) return { error: error.message }
    if (!data) return { error: 'Пустой ответ от сервера' }
    if (data.error) return { error: data.error }
    if (typeof data.answer !== 'string' || !data.answer.trim()) return { error: 'Пустой ответ от AI CFO' }
    return { answer: data.answer }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}
