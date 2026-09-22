export interface AiCfoMessage {
  id: string
  role: 'user' | 'assistant'
  createdAt: string
  content: string
  structured?: {
    shortAnswer: string
    why: string
    calculation: string
    whatToDo: string
    whatChanges: string
  }
  missingData?: string[]
  /** true — ответ от YandexGPT, false/undefined — от rule-based движка (в т.ч. как откат при ошибке LLM). */
  fromLlm?: boolean
  /** Если LLM была недоступна и сработал откат на rule-based — что пошло не так, для прозрачности. */
  llmFallbackReason?: string
}
