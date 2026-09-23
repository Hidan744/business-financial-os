import { useState } from 'react'
import { Bot, Construction, Send, User } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InfoTooltip } from '@/components/ui/tooltip'
import { useFinancials } from '@/hooks/useFinancials'
import { useDiagnostics } from '@/hooks/useDiagnostics'
import { useBusinessStore } from '@/store/businessStore'
import { useAuthStore } from '@/store/authStore'
import { answerQuestion } from '@/lib/ai/cfoEngine'
import { askAiCfo } from '@/lib/ai/cfoEngineV2'
import { buildFinancialContext } from '@/lib/ai/buildFinancialContext'
import { generateId } from '@/lib/id'
import type { AiCfoMessage } from '@/types/ai'
import { cn } from '@/lib/utils'
import { getEffectiveModules } from '@/types/modules'

interface Suggestion {
  text: string
  /** Если задан — подсказка показывается только при modules[module] === true (нет смысла спрашивать про наём, если в бизнесе нет модуля «Сотрудники»). */
  module?: 'marketing' | 'hr'
}

const SUGGESTIONS: Suggestion[] = [
  { text: 'Почему моя прибыль такая низкая?' },
  { text: 'Что будет, если я увеличу рекламу на 30%?', module: 'marketing' },
  { text: 'Можно ли мне нанять ещё сотрудника?', module: 'hr' },
  { text: 'Какую выручку мне нужно сделать для прибыли 500000?' },
  { text: 'Где я теряю больше всего денег?' },
  { text: 'Какие расходы стоит проверить в первую очередь?' },
]

export function AiCfoPage() {
  const { inputs, snapshot } = useFinancials()
  const diagnostics = useDiagnostics()
  const profile = useBusinessStore((s) => s.profile)
  const history = useBusinessStore((s) => s.history)
  const balanceSheet = useBusinessStore((s) => s.balanceSheet)
  const cashFlowInputs = useBusinessStore((s) => s.cashFlowInputs)
  const forecastConfig = useBusinessStore((s) => s.forecastConfig)
  const unitEconomics = useBusinessStore((s) => s.unitEconomics)
  const taxSettings = useBusinessStore((s) => s.taxSettings)
  const aiHistory = useBusinessStore((s) => s.aiHistory)
  const addAiMessage = useBusinessStore((s) => s.addAiMessage)
  const authStatus = useAuthStore((s) => s.status)
  const cloudEnabled = useAuthStore((s) => s.cloudEnabled)
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const modules = getEffectiveModules(profile)

  // Интеграция с YandexGPT (buildFinancialContext.ts, cfoEngineV2.ts, supabase/functions/ai-cfo)
  // полностью готова и протестирована, но пока не задеплоена (нужны Yandex Cloud API-ключ и
  // Supabase secrets на стороне пользователя) — временно выключено флагом, чтобы не дёргать
  // недоступную функцию зря. Когда задеплоят — вернуть `cloudEnabled && authStatus === 'authenticated'`.
  const AI_CFO_LLM_ENABLED = false
  const llmAvailable = AI_CFO_LLM_ENABLED && cloudEnabled && authStatus === 'authenticated'

  if (!inputs || !snapshot || !diagnostics || !profile) return null

  async function handleSend(text: string) {
    const question = text.trim()
    if (!question || thinking) return

    const userMessage: AiCfoMessage = {
      id: generateId('msg'),
      role: 'user',
      createdAt: new Date().toISOString(),
      content: question,
    }
    await addAiMessage(userMessage)
    setDraft('')
    setThinking(true)

    try {
      if (llmAvailable) {
        const context = buildFinancialContext({
          profile: profile!,
          inputs: inputs!,
          snapshot: snapshot!,
          diagnostics: diagnostics!,
          history,
          balanceSheet,
          cashFlowInputs,
          forecastConfig,
          unitEconomics,
        })
        const priorTurns = [...aiHistory, userMessage]
          .slice(-7, -1)
          .map((m) => ({ role: m.role, text: m.content }))
        const result = await askAiCfo(question, context, priorTurns)

        if (result.answer) {
          await addAiMessage({
            id: generateId('msg'),
            role: 'assistant',
            createdAt: new Date().toISOString(),
            content: result.answer,
            fromLlm: true,
          })
          return
        }

        // LLM недоступна/ошиблась — тихий откат на rule-based, но с честной пометкой почему.
        await sendRuleBasedAnswer(question, result.error)
        return
      }

      await sendRuleBasedAnswer(question)
    } finally {
      setThinking(false)
    }
  }

  async function sendRuleBasedAnswer(question: string, llmFallbackReason?: string) {
    const result = answerQuestion(question, inputs!, snapshot!, diagnostics!, profile?.employeesCount ?? 0, taxSettings)
    await addAiMessage({
      id: generateId('msg'),
      role: 'assistant',
      createdAt: new Date().toISOString(),
      content: result.answer?.shortAnswer ?? 'Не хватает данных для точного ответа.',
      structured: result.answer,
      missingData: result.missingData,
      fromLlm: false,
      llmFallbackReason,
    })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink-50 flex items-center gap-2">
          <Bot className="size-6 text-brand-400" /> AI CFO
          {!llmAvailable && (
            <span className="inline-flex items-center gap-1 text-xs font-normal text-ink-400 bg-ink-800 rounded-full px-2.5 py-1">
              <Construction className="size-3" /> Свободные ответы — в разработке
            </span>
          )}
          <InfoTooltip>
            {llmAvailable
              ? 'Отвечает через YandexGPT, но использует только реальные цифры вашего бизнеса — модель ничего не считает сама, только объясняет уже готовые расчёты. Если YandexGPT недоступна, автоматически переключается на базовый режим.'
              : 'Сейчас — базовый режим: распознаёт вопрос по ключевым словам и считает точный ответ формулами. Свободные ответы на любую формулировку вопроса (через YandexGPT) — в разработке, скоро подключим.'}
          </InfoTooltip>
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          Отвечает только на основании ваших реальных данных и рассчитанных показателей.
        </p>
      </div>

      {!llmAvailable && (
        <div className="rounded-xl border border-ink-800 px-4 py-3 text-xs text-ink-500 flex items-start gap-1.5">
          <Construction className="size-3.5 shrink-0 mt-0.5 text-ink-400" />
          <span>
            AI CFO пока в разработке: свободные ответы через YandexGPT ещё не подключены. Сейчас работает
            базовый режим — ответы по ключевым словам вопроса, посчитанные точными формулами по вашим данным.
          </span>
        </div>
      )}

      {aiHistory.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.filter((s) => !s.module || modules[s.module]).map((s) => (
            <Button key={s.text} variant="secondary" size="sm" onClick={() => handleSend(s.text)}>
              {s.text}
            </Button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {aiHistory.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {thinking && (
          <div className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
              <Bot className="size-4" />
            </div>
            <Card className="px-4 py-2.5 max-w-xl">
              <p className="text-sm text-ink-500">Думаю…</p>
            </Card>
          </div>
        )}
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
          disabled={thinking}
          className="flex-1"
        />
        <Button type="submit" size="icon" aria-label="Отправить" disabled={thinking}>
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
          {message.llmFallbackReason && (
            <p className="text-xs text-warning-500 mb-3">
              YandexGPT недоступна ({message.llmFallbackReason}) — ответ в базовом режиме.
            </p>
          )}
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
            <p className="text-sm text-ink-300 whitespace-pre-wrap">{message.content}</p>
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
