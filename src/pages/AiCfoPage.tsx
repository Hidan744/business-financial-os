import { useState } from 'react'
import { Bot, Send, User } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useFinancials } from '@/hooks/useFinancials'
import { useDiagnostics } from '@/hooks/useDiagnostics'
import { useBusinessStore } from '@/store/businessStore'
import { answerQuestion } from '@/lib/ai/cfoEngine'
import { generateId } from '@/lib/id'
import type { AiCfoMessage } from '@/types/ai'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'Почему моя прибыль такая низкая?',
  'Что будет, если я увеличу рекламу на 30%?',
  'Можно ли мне нанять ещё сотрудника?',
  'Какую выручку мне нужно сделать для прибыли 500000?',
  'Где я теряю больше всего денег?',
  'Какие расходы стоит проверить в первую очередь?',
]

export function AiCfoPage() {
  const { inputs, snapshot } = useFinancials()
  const diagnostics = useDiagnostics()
  const profile = useBusinessStore((s) => s.profile)
  const aiHistory = useBusinessStore((s) => s.aiHistory)
  const addAiMessage = useBusinessStore((s) => s.addAiMessage)
  const [draft, setDraft] = useState('')

  if (!inputs || !snapshot || !diagnostics) return null

  async function handleSend(text: string) {
    const question = text.trim()
    if (!question) return

    const userMessage: AiCfoMessage = {
      id: generateId('msg'),
      role: 'user',
      createdAt: new Date().toISOString(),
      content: question,
    }
    await addAiMessage(userMessage)
    setDraft('')

    const result = answerQuestion(question, inputs!, snapshot!, diagnostics!, profile?.employeesCount ?? 0)
    const assistantMessage: AiCfoMessage = {
      id: generateId('msg'),
      role: 'assistant',
      createdAt: new Date().toISOString(),
      content: result.answer?.shortAnswer ?? 'Не хватает данных для точного ответа.',
      structured: result.answer,
      missingData: result.missingData,
    }
    await addAiMessage(assistantMessage)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50 flex items-center gap-2">
          <Bot className="size-6 text-brand-400" /> AI CFO
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          Отвечает только на основании ваших реальных данных и рассчитанных показателей.
        </p>
      </div>

      {aiHistory.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <Button key={s} variant="secondary" size="sm" onClick={() => handleSend(s)}>
              {s}
            </Button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {aiHistory.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSend(draft)
        }}
        className="flex items-center gap-2 sticky bottom-4"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Спросите о своих финансах…"
          className="flex-1"
        />
        <Button type="submit" size="icon" aria-label="Отправить">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  )
}

function MessageBubble({ message }: { message: AiCfoMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-ink-800 text-ink-300' : 'bg-brand-500/15 text-brand-400',
        )}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>

      {isUser ? (
        <Card className="px-4 py-2.5 bg-ink-800 border-ink-700 max-w-lg">
          <p className="text-sm text-ink-100">{message.content}</p>
        </Card>
      ) : (
        <Card className="p-5 max-w-xl w-full">
          {message.missingData ? (
            <div>
              <p className="text-sm font-medium text-warning-500 mb-2">Недостаточно данных для точного ответа</p>
              <ul className="list-disc list-inside text-sm text-ink-400 space-y-1">
                {message.missingData.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          ) : message.structured ? (
            <div className="space-y-3">
              <StructuredRow label="Короткий ответ" value={message.structured.shortAnswer} emphasize />
              <StructuredRow label="Почему" value={message.structured.why} />
              <StructuredRow label="Расчёт" value={message.structured.calculation} mono />
              <StructuredRow label="Что можно сделать" value={message.structured.whatToDo} />
              <StructuredRow label="Что изменится" value={message.structured.whatChanges} />
            </div>
          ) : (
            <p className="text-sm text-ink-300">{message.content}</p>
          )}
        </Card>
      )}
    </div>
  )
}

function StructuredRow({ label, value, emphasize, mono }: { label: string; value: string; emphasize?: boolean; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-medium text-ink-500 mb-1">{label}</div>
      <p className={cn('text-sm', emphasize ? 'text-ink-50 font-medium' : 'text-ink-300', mono && 'font-mono text-xs')}>
        {value}
      </p>
    </div>
  )
}
