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
}
